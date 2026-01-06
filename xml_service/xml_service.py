import os
import re
from concurrent import futures

import grpc

import messages_pb2
import messages_pb2_grpc
from db_connection import connect, ensure_schema
import socket
import threading

from xml_processor import handle_client, start_worker


DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 50051
UPPER_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
LOWER_ALPHA = "abcdefghijklmnopqrstuvwxyz"

BOOKS_QUERY = """
SELECT
  b.title,
  b.authors,
  b.publisher,
  b.language,
  COALESCE((xpath('string(ISBN/isbn_10)', b.book_xml))[1]::text, '') AS isbn_10,
  COALESCE((xpath('string(ISBN/isbn_13)', b.book_xml))[1]::text, '') AS isbn_13,
  b.description
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
    description text PATH 'description'
) AS b
WHERE s.id = (SELECT MAX(id) FROM scrapdocs);
"""

AUTHORS_QUERY = """
SELECT
  COALESCE((xpath('string(authors)', b.book_xml))[1]::text, '') AS authors
FROM scrapdocs s
CROSS JOIN LATERAL XMLTABLE(
  '/books/book'
  PASSING s.doc
  COLUMNS
    book_xml xml PATH '.'
) AS b
WHERE s.id = (SELECT MAX(id) FROM scrapdocs);
"""


def split_authors(text):
    if not text:
        return []
    parts = re.split(r"\s*\|\s*|\s*,\s*|\s*;\s*|\s+and\s+", text, flags=re.IGNORECASE)
    return [part.strip() for part in parts if part.strip()]


def xpath_literal(value):
    if "'" not in value:
        return f"'{value}'"
    if '"' not in value:
        return f'"{value}"'
    parts = value.split("'")
    joined = ", \"'\", ".join(f"'{part}'" for part in parts)
    return f"concat({joined})"


def build_path_for_title(term):
    if not term:
        return "/books/book"
    safe_term = xpath_literal(term.lower())
    return (
        "/books/book[contains("
        f"translate(title, '{UPPER_ALPHA}', '{LOWER_ALPHA}'), {safe_term})]"
    )


def build_path_for_author(term):
    if not term:
        return "/books/book"
    safe_term = xpath_literal(term.lower())
    return (
        "/books/book[contains("
        f"translate(authors, '{UPPER_ALPHA}', '{LOWER_ALPHA}'), {safe_term})]"
    )


def query_books(path_expr):
    with connect() as conn:
        ensure_schema(conn)
        with conn.cursor() as cur:
            cur.execute(BOOKS_QUERY, (path_expr,))
            rows = cur.fetchall()
    books = []
    for row in rows:
        title, authors_raw, publisher, language, isbn_10, isbn_13, description = row
        books.append(
            {
                "title": title or "",
                "authors": split_authors(authors_raw),
                "publisher": publisher or "",
                "language": language or "",
                "isbn_10": isbn_10 or "",
                "isbn_13": isbn_13 or "",
                "description": description or "",
            }
        )
    return books


def query_authors():
    with connect() as conn:
        ensure_schema(conn)
        with conn.cursor() as cur:
            cur.execute(AUTHORS_QUERY)
            rows = cur.fetchall()
    names = []
    seen = set()
    for (authors_raw,) in rows:
        for name in split_authors(authors_raw):
            key = name.lower()
            if key in seen:
                continue
            seen.add(key)
            names.append(name)
    return names


def books_to_proto(books):
    return [
        messages_pb2.Book(
            title=book["title"],
            authors=book["authors"],
            publisher=book["publisher"],
            language=book["language"],
            isbn_10=book["isbn_10"],
            isbn_13=book["isbn_13"],
            description=book["description"],
        )
        for book in books
    ]


def load_books_or_abort(context, path_expr):
    try:
        return query_books(path_expr)
    except Exception as exc:
        context.abort(grpc.StatusCode.INTERNAL, str(exc))


def load_authors_or_abort(context):
    try:
        return query_authors()
    except Exception as exc:
        context.abort(grpc.StatusCode.INTERNAL, str(exc))


class BookServiceServicer(messages_pb2_grpc.BookServiceServicer):
    def ListBooks(self, request, context):
        books = load_books_or_abort(context, "/books/book")
        return messages_pb2.BookList(books=books_to_proto(books))

    def SearchBooksByName(self, request, context):
        term = request.query.strip().lower()
        if not term:
            return messages_pb2.BookList()
        path_expr = build_path_for_title(term)
        books = load_books_or_abort(context, path_expr)
        return messages_pb2.BookList(books=books_to_proto(books))

    def SearchBooksByAuthor(self, request, context):
        term = request.query.strip().lower()
        if not term:
            return messages_pb2.BookList()
        path_expr = build_path_for_author(term)
        books = load_books_or_abort(context, path_expr)
        return messages_pb2.BookList(books=books_to_proto(books))

    def ListAuthors(self, request, context):
        authors = load_authors_or_abort(context)
        authors = [messages_pb2.Author(name=name) for name in authors]
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
def main():
    start_worker()
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind((HOST, PORT))
        server.listen(1)
        server.settimeout(1.0)
        print(f"Active on {HOST}:{PORT}")
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
            print("closed")


if __name__ == "__main__":
    serve()
