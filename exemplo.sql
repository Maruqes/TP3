SELECT
  x.title,
  x.authors,
  x.publisher,
  x.language,
  x.isbn_10,
  x.isbn_13,
  x.description
FROM public.scrapdocs s
CROSS JOIN LATERAL XMLTABLE(
  '/books/book'
  PASSING s.doc
  COLUMNS
    title       text PATH 'title',
    authors     text PATH 'authors',
    publisher   text PATH 'publisher',
    language    text PATH 'language',
    isbn_10     text PATH 'ISBN/isbn_10',
    isbn_13     text PATH 'ISBN/isbn_13',
    description text PATH 'description'
) AS x--
where s.id = 1;


----------------- para meter a filtrar merdas ------------------------