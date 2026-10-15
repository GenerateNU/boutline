# The desired schema is whatever cmd/atlasloader prints: the gorm models plus
# cmd/atlasloader/fuzzy_search.sql, which it appends for the expression indexes
# gorm can't declare. `atlas migrate diff` compares that against the
# migrations already in ./migrations and writes the difference as the next
# versioned file.
data "external_schema" "gorm" {
  program = ["go", "run", "-mod=mod", "./cmd/atlasloader"]
}

env "local" {
  src = data.external_schema.gorm.url

  # Throwaway container Atlas uses to normalise the schema before diffing. It
  # is created and dropped per command and never touches the dev stack. Built
  # from atlas/dev-db instead of plain postgres so pg_trgm is already in
  # template1 — needed because the expression indexes above reference
  # gin_trgm_ops, and Atlas Community won't let the schema declare the
  # extension itself.
  dev = "docker://postgres/17-trgm/dev?search_path=public"

  migration {
    dir = "file://migrations"
  }

  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}
