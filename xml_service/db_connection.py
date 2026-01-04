import os
import psycopg2


ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def load_env_file(path=ENV_PATH):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


def get_env(name, required=True, default=None):
    value = os.getenv(name, default)
    if value == "":
        value = default
    if required and not value:
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


def get_db_config():
    load_env_file()
    return {
        "host": get_env("DB_HOST"),
        "port": int(get_env("DB_PORT")),
        "dbname": get_env("DB_NAME"),
        "user": get_env("DB_USER"),
        "password": get_env("DB_PASSWORD"),
    }


def connect():
    return psycopg2.connect(**get_db_config())


def ensure_schema(conn):
    with open(SCHEMA_PATH, "r", encoding="utf-8") as handle:
        schema_sql = handle.read()
    with conn.cursor() as cur:
        cur.execute(schema_sql)
    conn.commit()


def insert_xml_document(conn, xml_text, mapper_version=None):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO scrapdocs (doc, mapper_version) "
            "VALUES (%s, %s) RETURNING id",
            (xml_text, mapper_version),
        )
        row_id = cur.fetchone()[0]
    conn.commit()
    return row_id
