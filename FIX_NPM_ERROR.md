# Fix: npm PowerShell Execution Policy Error

## Quick Fix: Use Command Prompt Instead

**Easiest Solution:** Use Command Prompt (CMD) instead of PowerShell - no policy changes needed!

1. **Open Command Prompt:**
   - Press `Win + R`
   - Type: `cmd`
   - Press Enter

2. **Navigate to your project:**
   ```
   cd "C:\Users\user\Documents\GitHub\locuta.ai"
   ```

3. **Run npm install:**
   ```
   npm install
   ```

This will work immediately without any policy changes!

---

## Alternative: Fix PowerShell Execution Policy

If you prefer to use PowerShell, you need to allow scripts to run:

### Method 1: Change Policy for Current User (Recommended)

1. **Open PowerShell as Administrator:**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Run this command:**
   ```
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Type `Y` when prompted**

4. **Close and reopen your regular PowerShell**

5. **Try npm install again:**
   ```
   npm install
   ```

### Method 2: Bypass Policy for Current Session Only

If you don't want to change the policy permanently, you can bypass it just for this session:

1. **In your current PowerShell, run:**
   ```
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   ```

2. **Then run:**
   ```
   npm install
   ```

Note: This only works for the current PowerShell window. You'll need to do it again if you open a new window.

### Method 3: Use npm.cmd Directly

You can call npm using the .cmd version directly:

```
& "C:\Program Files\nodejs\npm.cmd" install
```

Or create an alias in PowerShell:
```
Set-Alias npm "C:\Program Files\nodejs\npm.cmd"
npm install
```

---

## Recommended Approach

**Use Command Prompt (CMD)** - it's the simplest solution and doesn't require any policy changes or administrator rights.
