import os
import re
import socket
import threading
import xml.etree.ElementTree as ET
from concurrent import futures

import grpc

import messages_pb2
import messages_pb2_grpc
from db_connection import connect, ensure_schema
from xml_processor import handle_client, start_worker


DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 50051
DEFAULT_SOCKET_HOST = "0.0.0.0"
DEFAULT_SOCKET_PORT = 9000  


BOOKS_QUERY = """
SELECT
  b.title,
  b.authors,
  b.publisher,
  b.language,
  COALESCE((xpath('string(ISBN/isbn_10)', b.book_xml))[1]::text, '') AS isbn_10,
  COALESCE((xpath('string(ISBN/isbn_13)', b.book_xml))[1]::text, '') AS isbn_13,
  b.description,
  b.small_thumbnail,
  b.thumbnail
FROM scrapdocs s
CROSS JOIN LATERAL XMLTABLE(
  %s
  PASSING s.doc
  COLUMNS
    book_xml xml PATH '.',
    title text PATH 'title',
    authors text PATH 'authors',
    publisher text PATH 'publisher',
    language text PATH 'language',
    description text PATH 'description',
    small_thumbnail text PATH 'thumbnails/smallThumbnail',
    thumbnail text PATH 'thumbnails/thumbnail'
) AS b
WHERE s.id = (SELECT MAX(id) FROM scrapdocs);
"""

AUTHORS_QUERY = """
SELECT
  unnest(xpath('/books/book/authors/text()', s.doc))::text AS author
FROM scrapdocs s
WHERE s.id = (SELECT MAX(id) FROM scrapdocs);
"""

BOOKS_BY_AUTHOR_QUERY = """
SELECT
  unnest(
    xpath(
      '/books/book[contains(authors, "' || %s || '")]',
      s.doc
    )
  )::text AS book_xml
FROM scrapdocs s
WHERE s.id = (SELECT MAX(id) FROM scrapdocs);
"""

BOOKS_BY_TITLE_QUERY = """
SELECT
  unnest(
    xpath(
      '/books/book[contains(title, "' || %s || '")]',
      s.doc
    )
  )::text AS book_xml
FROM scrapdocs s
WHERE s.id = (SELECT MAX(id) FROM scrapdocs);
"""

def split_authors(text):
    if not text:
        return []
    parts = re.split(r"\s*\|\s*|\s*,\s*|\s*;\s*|\s+and\s+", text, flags=re.IGNORECASE)
    return [part.strip() for part in parts if part.strip()]


def parse_book_xml(book_xml, context):
    if book_xml is None:
        return messages_pb2.Book()
    try:
        root = ET.fromstring(str(book_xml))
    except ET.ParseError as exc:
        context.abort(grpc.StatusCode.INTERNAL, f"Invalid book XML: {exc}")
    title = (root.findtext("title") or "").strip()
    authors_text = (root.findtext("authors") or "").strip()
    publisher = (root.findtext("publisher") or "").strip()
    language = (root.findtext("language") or "").strip()
    description = (root.findtext("description") or "").strip()
    isbn_10 = (root.findtext("ISBN/isbn_10") or "").strip()
    isbn_13 = (root.findtext("ISBN/isbn_13") or "").strip()
    small_thumbnail = (root.findtext("thumbnails/smallThumbnail") or "").strip()
    thumbnail = (root.findtext("thumbnails/thumbnail") or "").strip()
    return messages_pb2.Book(
        title=title,
        authors=split_authors(authors_text),
        publisher=publisher,
        language=language,
        isbn_10=isbn_10,
        isbn_13=isbn_13,
        description=description,
        small_thumbnail=small_thumbnail,
        thumbnail=thumbnail,
    )

class BookServiceServicer(messages_pb2_grpc.BookServiceServicer):
    def ListBooks(self, request, context):
        try:
            with connect() as conn:
                ensure_schema(conn)
                with conn.cursor() as cur:
                    cur.execute(BOOKS_QUERY, ("/books/book",))
                    rows = cur.fetchall()
        except Exception as exc:
            context.abort(grpc.StatusCode.INTERNAL, str(exc))

        books = []
        for row in rows:
            (
                title,
                authors,
                publisher,
                language,
                isbn_10,
                isbn_13,
                description,
                small_thumbnail,
                thumbnail,
            ) = row
            books.append(
                messages_pb2.Book(
                    title=title or "",
                    authors=[authors] if authors else [],
                    publisher=publisher or "",
                    language=language or "",
                    isbn_10=isbn_10 or "",
                    isbn_13=isbn_13 or "",
                    description=description or "",
                    small_thumbnail=small_thumbnail or "",
                    thumbnail=thumbnail or "",
                )
            )
        return messages_pb2.BookList(books=books)

    def SearchBooksByName(self, request, context):
        term = request.query.strip()
        if not term:
            return messages_pb2.BookList()
        try:
            with connect() as conn:
                ensure_schema(conn)
                with conn.cursor() as cur:
                    cur.execute(BOOKS_BY_TITLE_QUERY, (term,))
                    rows = cur.fetchall()
        except Exception as exc:
            context.abort(grpc.StatusCode.INTERNAL, str(exc))

        books = [parse_book_xml(row[0], context) for row in rows]
        return messages_pb2.BookList(books=books)

    def SearchBooksByAuthor(self, request, context):
        term = request.query.strip()
        if not term:
            return messages_pb2.BookList()
        try:
            with connect() as conn:
                ensure_schema(conn)
                with conn.cursor() as cur:
                    cur.execute(BOOKS_BY_AUTHOR_QUERY, (term,))
                    rows = cur.fetchall()
        except Exception as exc:
            context.abort(grpc.StatusCode.INTERNAL, str(exc))

        books = [parse_book_xml(row[0], context) for row in rows]
        return messages_pb2.BookList(books=books)

    def ListAuthors(self, request, context):
        try:
            with connect() as conn:
                ensure_schema(conn)
                with conn.cursor() as cur:
                    cur.execute(AUTHORS_QUERY)
                    rows = cur.fetchall()
        except Exception as exc:
            context.abort(grpc.StatusCode.INTERNAL, str(exc))

        authors = []
        seen = set()
        for (authors_raw,) in rows:
            for name in split_authors(authors_raw):
                key = name.lower()
                if key in seen:
                    continue
                seen.add(key)
                authors.append(messages_pb2.Author(name=name))
        return messages_pb2.AuthorList(authors=authors)


def serve():
    host = os.getenv("GRPC_HOST", DEFAULT_HOST)
    port = int(os.getenv("GRPC_PORT", str(DEFAULT_PORT)))
    address = f"{host}:{port}"
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    messages_pb2_grpc.add_BookServiceServicer_to_server(BookServiceServicer(), server)
    server.add_insecure_port(address)
    print(f"BookService listening on {address} using PostgreSQL")
    server.start()
    server.wait_for_termination()


def run_socket_server():
    host = os.getenv("SOCKET_HOST", DEFAULT_SOCKET_HOST)
    port = int(os.getenv("SOCKET_PORT", str(DEFAULT_SOCKET_PORT)))
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind((host, port))
        server.listen(5)
        server.settimeout(1.0)
        print(f"Socket server listening on {host}:{port}")
        try:
            while True:
                try:
                    conn, addr = server.accept()
                except socket.timeout:
                    continue
                thread = threading.Thread(
                    target=handle_client, args=(conn, addr), daemon=True
                )
                thread.start()
        except KeyboardInterrupt:
            print("Socket server closed")


def main():
    start_worker()
    socket_thread = threading.Thread(target=run_socket_server, daemon=True)
    socket_thread.start()
    serve()


if __name__ == "__main__":
    main()
