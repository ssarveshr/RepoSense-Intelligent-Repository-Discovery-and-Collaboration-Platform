import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class TokenEncryptionError(Exception):
    pass


def _decode_key(key_value: str) -> bytes:
    cleaned = key_value.strip()
    if not cleaned:
        raise TokenEncryptionError("GitHub token encryption key is not configured.")

    # Support 64-character hex-encoded 32-byte keys (common local dev format).
    if len(cleaned) == 64 and all(char in "0123456789abcdefABCDEF" for char in cleaned):
        try:
            key = bytes.fromhex(cleaned)
            if len(key) == 32:
                return key
        except ValueError as exc:
            raise TokenEncryptionError("Invalid GitHub token encryption key encoding.") from exc

    try:
        key = base64.urlsafe_b64decode(cleaned.encode("ascii"))
    except Exception as exc:
        raise TokenEncryptionError("Invalid GitHub token encryption key encoding.") from exc

    if len(key) != 32:
        raise TokenEncryptionError("GitHub token encryption key must decode to 32 bytes.")
    return key


def encrypt_github_token(plaintext: str, key_value: str) -> str:
    if not plaintext:
        raise TokenEncryptionError("Cannot encrypt an empty token.")
    key = _decode_key(key_value)
    nonce = os.urandom(12)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")


def decrypt_github_token(encrypted: str, key_value: str) -> str:
    if not encrypted:
        raise TokenEncryptionError("Cannot decrypt an empty token payload.")
    key = _decode_key(key_value)
    try:
        payload = base64.urlsafe_b64decode(encrypted.encode("ascii"))
        nonce, ciphertext = payload[:12], payload[12:]
        plaintext = AESGCM(key).decrypt(nonce, ciphertext, None)
    except Exception as exc:
        raise TokenEncryptionError("Unable to decrypt stored GitHub token.") from exc
    return plaintext.decode("utf-8")
