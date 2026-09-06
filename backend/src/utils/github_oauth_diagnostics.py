"""Safe OAuth callback stage diagnostics (never logs tokens or secrets)."""

from __future__ import annotations

from src.utils.github_diagnostics import _emit_diagnostic, github_diagnostics_enabled


def log_github_oauth_stage(stage: str, **fields) -> None:
    if not github_diagnostics_enabled():
        return
    safe_fields = {
        key: value
        for key, value in fields.items()
        if value is not None and key not in {"access_token", "client_secret", "authorization"}
    }
    _emit_diagnostic({"oauth_stage": stage, **safe_fields})


def log_github_oauth_callback_summary(**fields) -> None:
    if not github_diagnostics_enabled():
        return
    _emit_diagnostic({"oauth_callback": "summary", **{k: v for k, v in fields.items() if v is not None}})
