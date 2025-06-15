import os
import re
import sys

def create_project_from_spec(file_path):
    """
    Parses a file containing <file> tags and creates the specified
    directory structure and files.
    """
    print(f"Reading project specification from: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"ERROR: The file '{file_path}' was not found.")
        print("Please save the <files> block into a file named 'files.txt' in the same directory as this script.")
        sys.exit(1)

    # Regex to find each <file> tag and its content
    # re.DOTALL makes . match newlines
    file_pattern = re.compile(r'<file path="(.*?)">(.*?)</file>', re.DOTALL)
    
    # Regex to find the code within ```...``` blocks, ignoring the language specifier
    code_pattern = re.compile(r'```[a-zA-Z]*\n(.*?)\n```', re.DOTALL)

    files_created = 0
    
    # Find all file blocks in the text
    file_matches = file_pattern.finditer(content)

    for file_match in file_matches:
        relative_path = file_match.group(1).strip()
        inner_content = file_match.group(2)

        # Extract the code from the ``` block
        code_match = code_pattern.search(inner_content)
        
        if not code_match:
            print(f"  - WARNING: Could not find a ```code``` block in {relative_path}. Skipping.")
            continue

        code_to_write = code_match.group(1)

        try:
            # Get the directory part of the path
            directory = os.path.dirname(relative_path)
            
            # Create the directory structure if it doesn't exist
            if directory:
                os.makedirs(directory, exist_ok=True)
                print(f"  - Directory '{directory}' created or already exists.")

            # Write the extracted code to the file
            with open(relative_path, 'w', encoding='utf-8') as f:
                f.write(code_to_write)
            
            print(f"  - SUCCESS: Created file '{relative_path}'")
            files_created += 1
            
        except IOError as e:
            print(f"  - ERROR: Could not write file '{relative_path}'. Reason: {e}")
        except Exception as e:
            print(f"  - ERROR: An unexpected error occurred for '{relative_path}'. Reason: {e}")

    print("\n-------------------------------------------------")
    if files_created > 0:
        print(f"Project creation complete. {files_created} files were created.")
        print("Next steps:")
        print("1. Navigate to the 'nearby-nearby-admin' directory: cd nearby-nearby-admin")
        print("2. Create a '.env.local' file from '.env' and set your ADMIN_PASSWORD.")
        print("3. Install dependencies: npm install")
        print("4. Run the development environment: docker-compose up --build")
    else:
        print("No files were created. Please check the format of 'files.txt'.")
    print("-------------------------------------------------")


if __name__ == "__main__":
    # The name of the file containing the project specification
    spec_file = "files.txt"
    create_project_from_spec(spec_file)