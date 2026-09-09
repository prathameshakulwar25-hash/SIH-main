import subprocess
import sys

def check_tesseract():
    try:
        result = subprocess.run(["tesseract", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"Tesseract is installed:\n{result.stdout.splitlines()[0]}")
            return True
    except FileNotFoundError:
        pass
        
    # Check default Windows paths
    paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
    ]
    for p in paths:
        import os
        if os.path.exists(p):
            print(f"Tesseract is installed at {p}")
            return True
            
    print("Tesseract NOT FOUND.")
    return False

if __name__ == "__main__":
    check_tesseract()
