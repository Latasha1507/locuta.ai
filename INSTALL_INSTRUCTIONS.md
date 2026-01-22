# Installation Instructions for Locuta.ai (Windows)

**Note:** These instructions are for Windows PowerShell or Command Prompt. You don't need bash or git installed.

## Step 1: Install Node.js

1. **Download Node.js:**
   - Go to https://nodejs.org/
   - Click on the **LTS (Long Term Support)** version button (recommended)
   - This will download the Windows installer (.msi file)

2. **Run the Installer:**
   - Double-click the downloaded `.msi` file
   - Follow the installation wizard:
     - Click "Next" through the setup
     - Accept the license agreement
     - Keep the default installation path (usually `C:\Program Files\nodejs\`)
     - **IMPORTANT:** Make sure "Add to PATH" option is checked (it should be by default)
     - Click "Install"
   - Wait for installation to complete
   - Click "Finish"

3. **Verify Installation:**
   - Close and reopen your terminal/command prompt (PowerShell or CMD)
   - Run these commands to verify (works in both PowerShell and CMD):
     ```
     node --version
     npm --version
     ```
   - You should see version numbers (e.g., `v20.x.x` and `10.x.x`)

## Step 2: Install Project Dependencies

1. **Open Terminal in Project Directory:**
   - **Option A: Using File Explorer:**
     - Open File Explorer
     - Navigate to: `C:\Users\user\Documents\GitHub\locuta.ai`
     - Click in the address bar, type `powershell` and press Enter (this opens PowerShell in that folder)
     - OR right-click in the folder → "Open in Terminal" (if available)
   
   - **Option B: Using PowerShell/CMD directly:**
     - Open PowerShell or Command Prompt
     - Type: `cd "C:\Users\user\Documents\GitHub\locuta.ai"`
     - Press Enter
   
   - **Option C: Using Cursor/VS Code:**
     - Open the integrated terminal (View → Terminal, or press `` Ctrl+` ``)
     - The terminal should already be in your project folder

2. **Install Dependencies:**
   - In PowerShell or Command Prompt, type:
     ```
     npm install
     ```
   - Press Enter
   
   This will:
   - Read your `package.json` file
   - Download and install all required packages (Next.js, React, Supabase, etc.)
   - Create a `node_modules` folder with all dependencies
   - Create/update `package-lock.json` with exact versions

3. **Wait for Installation:**
   - This may take 2-5 minutes depending on your internet speed
   - You'll see progress indicators as packages are downloaded

4. **Verify Installation:**
   - After completion, check that `node_modules` folder exists
   - The TypeScript error for `next/server` should disappear
   - Your IDE should automatically detect the installed packages

## Step 3: Verify Everything Works

1. **Check TypeScript Errors:**
   - The error "Cannot find module 'next/server'" should be gone
   - Your IDE should now recognize Next.js types

2. **Optional: Run Development Server:**
   - In PowerShell or Command Prompt, type:
     ```
     npm run dev
     ```
   - Press Enter
   - This starts the Next.js development server
   - You should see output like: "Ready on http://localhost:3000"

## Troubleshooting

### If npm is still not recognized:
- **Restart your IDE/Editor** (VS Code, Cursor, etc.)
- **Restart your terminal** completely
- **Check PATH:** 
  - Open System Properties → Environment Variables
  - Verify `C:\Program Files\nodejs\` is in your PATH
  - If not, add it manually

### If installation fails:
- Make sure you have internet connection
- Try clearing npm cache: 
  ```
  npm cache clean --force
  ```
- Delete `node_modules` folder and `package-lock.json` file (if they exist) and try again
- Check if you have sufficient disk space

### If you get permission errors:
- Run terminal as Administrator
- Or install Node.js for your user only (not system-wide)

## What Gets Installed

The following key packages will be installed:
- **Next.js 15.1.3** - React framework (this fixes the `next/server` error)
- **React 19.0.0** - UI library
- **TypeScript 5** - Type checking
- **Supabase** - Database client
- And many other dependencies listed in `package.json`

---

**Note:** After installation, you may need to restart your IDE/editor for TypeScript to fully recognize the new modules.
