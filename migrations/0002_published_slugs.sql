ALTER TABLE posts ADD COLUMN published_slug TEXT;
ALTER TABLE albums ADD COLUMN published_slug TEXT;
CREATE UNIQUE INDEX posts_published_slug ON posts(published_slug) WHERE published_slug IS NOT NULL;
CREATE UNIQUE INDEX albums_published_slug ON albums(published_slug) WHERE published_slug IS NOT NULL;
