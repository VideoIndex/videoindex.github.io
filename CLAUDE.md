# videoindex.github.io — working notes for Claude

Generated output only. This is the built MkDocs Material site for the VideoIndex SDK, served by
GitHub Pages from the root of `main`. **Do not edit files here by hand.** The sources are the core
repo's `docs/*.md` (design documents, results pages) and `bindings/python/README.md`, assembled by
`videoindex_app/docs/sync.sh` and built with `mkdocs build` in `videoindex_app/docs`.

To update: change the source docs in the core repo, then from `videoindex_app`:

```sh
./docs/sync.sh && (cd docs && mkdocs build)
rsync -a --delete --exclude .git --exclude LICENSE --exclude README.md --exclude CLAUDE.md docs/site/ ../videoindex.github.io/
cd ../videoindex.github.io && touch .nojekyll && git add -A && git commit -m "docs: rebuild" && git push
```

Public, developer-oriented content only: no deployment, machine or planning material (that is in
the private `vi_internal` repo).
