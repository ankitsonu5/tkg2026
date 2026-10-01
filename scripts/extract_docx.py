import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def extract_text(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        xml_content = z.read('word/document.xml')
        root = ET.fromstring(xml_content)
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        paragraphs = []
        for p in root.iter(f"{{{ns['w']}}}p"):
            texts = [node.text for node in p.iter(f"{{{ns['w']}}}t") if node.text]
            if texts:
                paragraphs.append("".join(texts))
        return "\n".join(paragraphs)

if __name__ == "__main__":
    path = sys.argv[1]
    print(extract_text(path))
