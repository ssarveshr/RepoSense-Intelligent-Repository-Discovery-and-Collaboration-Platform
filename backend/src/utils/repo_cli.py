import os
import sys
import hashlib
import json
import time
import shutil

REPO_DIR = ".repo"
OBJECTS_DIR = os.path.join(REPO_DIR, "objects")
INDEX_FILE = os.path.join(REPO_DIR, "index.json")
COMMITS_FILE = os.path.join(REPO_DIR, "commits.json")


# ---------- UTILS ----------
def hash_content(content):
    return hashlib.sha1(content.encode()).hexdigest()


def ensure_repo():
    if not os.path.exists(REPO_DIR):
        print("[ERROR] Not a repo. Run 'repo copy' first.")
        sys.exit()


# ---------- COMMANDS ----------

# repo copy → clone/init
def clone_repo(path=None):
    if path is None:
        # INIT
        if os.path.exists(REPO_DIR):
            print("[WARN] Repo already exists")
            return

        os.makedirs(OBJECTS_DIR)

        with open(INDEX_FILE, "w") as f:
            json.dump({}, f)

        with open(COMMITS_FILE, "w") as f:
            json.dump([], f)

        print("[OK] Repo initialized")

    else:
        # CLONE
        if not os.path.exists(path):
            print("[ERROR] Source repo not found")
            return

        if os.path.exists(REPO_DIR):
            print("[WARN] Repo already exists here")
            return

        shutil.copytree(os.path.join(path, ".repo"), REPO_DIR)
        print("[OK] Repo cloned")


# repo add
def add_file(filename):
    ensure_repo()

    if not os.path.exists(filename):
        print("[ERROR] File not found")
        return

    with open(filename, "r") as f:
        content = f.read()

    file_hash = hash_content(content)

    with open(os.path.join(OBJECTS_DIR, file_hash), "w") as f:
        f.write(content)

    with open(INDEX_FILE, "r") as f:
        index = json.load(f)

    index[filename] = file_hash

    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=4)

    print(f"[OK] Added {filename}")


# repo msg → commit
def commit(message):
    ensure_repo()

    with open(INDEX_FILE, "r") as f:
        index = json.load(f)

    with open(COMMITS_FILE, "r") as f:
        commits = json.load(f)

    commit_data = {
        "id": hashlib.sha1(str(time.time()).encode()).hexdigest(),
        "timestamp": time.ctime(),
        "message": message,
        "files": index.copy()
    }

    commits.append(commit_data)

    with open(COMMITS_FILE, "w") as f:
        json.dump(commits, f, indent=4)

    print("[OK] Commit created")


# repo send → push (copy repo to remote folder)
def push(remote_path):
    ensure_repo()

    if not os.path.exists(remote_path):
        print("[ERROR] Remote path not found")
        return

    dest = os.path.join(remote_path, ".repo")

    if os.path.exists(dest):
        shutil.rmtree(dest)

    shutil.copytree(REPO_DIR, dest)

    print("[OK] Pushed to remote")


# repo get → pull (copy from remote)
def pull(remote_path):
    if not os.path.exists(remote_path):
        print("[ERROR] Remote path not found")
        return

    src = os.path.join(remote_path, ".repo")

    if not os.path.exists(src):
        print("[ERROR] No repo in remote")
        return

    if os.path.exists(REPO_DIR):
        shutil.rmtree(REPO_DIR)

    shutil.copytree(src, REPO_DIR)

    print("[OK] Pulled from remote")


# repo publish → Index in Semantic Search
def publish_to_discovery(category, description):
    ensure_repo()
    try:
        from src.services.search_service import engine
        
        # Get project details
        repo_name = os.path.basename(os.path.abspath(os.getcwd()))
        repo_path = os.path.abspath(os.getcwd())
        
        print(f"[INFO] Publishing '{repo_name}' to RepoSense AI...")
        
        engine.add_repository(
            name=repo_name,
            description=description,
            url=repo_path,
            stars=0, 
            category=category
        )
        print(f"[OK] Success! '{repo_name}' is now discoverable via semantic search.")
        
    except ImportError:
        print("[ERROR] Error: search_engine.py not found. Make sure you are in the backend folder.")
    except Exception as e:
        print(f"[ERROR] Failed to publish: {e}")


# ---------- CLI ----------
def main():
    if len(sys.argv) < 2:
        print("Usage: repo <command>")
        return

    cmd = sys.argv[1]

    if cmd == "copy":
        if len(sys.argv) == 2:
            clone_repo()  # init
        else:
            clone_repo(sys.argv[2])  # clone

    elif cmd == "add":
        add_file(sys.argv[2])

    elif cmd == "msg":
        commit(sys.argv[2])

    elif cmd == "send":
        push(sys.argv[2])

    elif cmd == "get":
        pull(sys.argv[2])

    elif cmd == "publish":
        if len(sys.argv) < 4:
            print("Usage: repo publish <category> <description>")
            return
        publish_to_discovery(sys.argv[2], sys.argv[3])

    else:
        print("[ERROR] Unknown command")


if __name__ == "__main__":
    main()