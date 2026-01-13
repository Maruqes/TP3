defmodule BiService.Book do
  use Ecto.Schema

  schema "books" do
    field(:title, :string)
    field(:authors, :string)
    field(:publisher, :string)
    field(:ISBN_10, :string)
    field(:ISBN_13, :string)
    field(:description, :string)
  end
end
