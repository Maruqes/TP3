defmodule Messages.Empty do
  @moduledoc false

  use Protobuf, full_name: "messages.Empty", protoc_gen_elixir_version: "0.16.0", syntax: :proto3
end

defmodule Messages.SearchRequest do
  @moduledoc false

  use Protobuf,
    full_name: "messages.SearchRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :query, 1, type: :string
end

defmodule Messages.Book do
  @moduledoc false

  use Protobuf, full_name: "messages.Book", protoc_gen_elixir_version: "0.16.0", syntax: :proto3

  field :title, 1, type: :string
  field :authors, 2, repeated: true, type: :string
  field :publisher, 3, type: :string
  field :language, 4, type: :string
  field :isbn_10, 5, type: :string, json_name: "isbn10"
  field :isbn_13, 6, type: :string, json_name: "isbn13"
  field :description, 7, type: :string
end

defmodule Messages.BookList do
  @moduledoc false

  use Protobuf,
    full_name: "messages.BookList",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :books, 1, repeated: true, type: Messages.Book
end

defmodule Messages.Author do
  @moduledoc false

  use Protobuf, full_name: "messages.Author", protoc_gen_elixir_version: "0.16.0", syntax: :proto3

  field :name, 1, type: :string
end

defmodule Messages.AuthorList do
  @moduledoc false

  use Protobuf,
    full_name: "messages.AuthorList",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :authors, 1, repeated: true, type: Messages.Author
end

defmodule Messages.BookService.Service do
  @moduledoc false

  use GRPC.Service, name: "messages.BookService", protoc_gen_elixir_version: "0.16.0"

  rpc :ListBooks, Messages.Empty, Messages.BookList

  rpc :SearchBooksByName, Messages.SearchRequest, Messages.BookList

  rpc :SearchBooksByAuthor, Messages.SearchRequest, Messages.BookList

  rpc :ListAuthors, Messages.Empty, Messages.AuthorList
end

defmodule Messages.BookService.Stub do
  @moduledoc false

  use GRPC.Stub, service: Messages.BookService.Service
end
