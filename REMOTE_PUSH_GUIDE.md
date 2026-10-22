# How to Send / Push a Folder from Another Laptop to This Server

You **do not** need to create the repository on the server first!
When you push from another laptop, the server will automatically create the repository and store all your files securely.

---

## Method 1: Over the Internet (Anywhere in the World)

### STEP 1: On THIS Laptop (The Server)
1. Run [`start_public_server.bat`](file:///d:/projects/major%20project/RepoSense-Intelligent-Repository-Discovery-and-Collaboration-Platform/start_public_server.bat) (or `start_public_server.ps1`).
2. Look at the screen and copy your Public URL, for example:
   `https://race-sms-calm-implementing.trycloudflare.com`

### STEP 2: On the OTHER Laptop (The Client)
1. Open the folder you want to send.
2. Open Terminal / Command Prompt / PowerShell / Git Bash inside that folder.
3. Run these commands:

```bash
git init
git add .
git commit -m "Upload project folder"
git branch -M main
git remote add origin https://<YOUR-PUBLIC-URL>/git/developer/my-folder-name.git
git push -u origin main
```

*(Replace `<YOUR-PUBLIC-URL>` with your active Cloudflare URL)*  
*(Replace `my-folder-name` with whatever you want to name the repo)*

**Example:**
```bash
git remote add origin https://race-sms-calm-implementing.trycloudflare.com/git/developer/my-project.git
git push -u origin main
```

4. **DONE!** All files and subfolders are now uploaded to your GitHost server!

---

## Method 2: On the Same Wi-Fi / Local Network (Fastest)

If both laptops are connected to the **SAME Wi-Fi router**:

1. On the OTHER laptop, open terminal inside your folder.
2. Run:

```bash
git init
git add .
git commit -m "Upload project folder"
git branch -M main
git remote add origin http://192.168.0.243:8000/git/developer/my-folder-name.git
git push -u origin main
```

3. **DONE!**

---

## How to Push Future Changes (From the Other Laptop)

Whenever you add new files or edit code in that folder on the other laptop:

```bash
git add .
git commit -m "Added new features"
git push
```

---

## How to Download / Clone the Folder onto Another Laptop

To download all files onto any new laptop:

- **Over the Internet:**
  ```bash
  git clone https://<YOUR-PUBLIC-URL>/git/developer/my-folder-name.git
  ```

- **Over Local Wi-Fi:**
  ```bash
  git clone http://192.168.0.243:8000/git/developer/my-folder-name.git
  ```

---

## Common Fixes & Tips

- **Q1: What if it says "remote origin already exists"?**  
  A1: Run this command first to update the URL:
  ```bash
  git remote set-url origin https://<YOUR-PUBLIC-URL>/git/developer/my-folder-name.git
  git push -u origin main
  ```

- **Q2: What if it asks for a username and password?**  
  A2: You can enter any username and password (or your registered GitHost user).

- **Q3: Can I view the uploaded files in a browser?**  
  A3: **YES!** Just open your public URL or `http://localhost:8000` in any browser.
