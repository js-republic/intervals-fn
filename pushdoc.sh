#!/bin/sh
npm run doc
touch docs/.nojekyll
git add docs && git commit -m "docs: update"
git subtree split --prefix docs -b gh-pages
git push -f origin gh-pages:gh-pages
git branch -D gh-pages
git reset HEAD~
