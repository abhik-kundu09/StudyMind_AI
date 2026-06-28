
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter


class PDFService:
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
    ):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def extract_text(self, file_bytes: bytes) -> tuple[list[str], int]:
        """
        Returns (pages_text_list, page_count).
        Each element is the extracted text of one page.
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = [page.get_text() for page in doc]
        doc.close()
        return pages, len(pages)

    def chunk_pages(
        self, pages: list[str], doc_id: str, filename: str
    ) -> list[dict]:
        """
        Splits page text into chunks with metadata.
        Returns list of {"text": ..., "metadata": {...}}.
        """
        chunks = []
        for page_num, text in enumerate(pages, start=1):
            if not text.strip():
                continue
            splits = self.splitter.split_text(text)
            for i, chunk in enumerate(splits):
                chunks.append(
                    {
                        "text": chunk,
                        "metadata": {
                            "doc_id": doc_id,
                            "filename": filename,
                            "page": page_num,
                            "chunk_index": i,
                        },
                    }
                )
        return chunks


pdf_service = PDFService()