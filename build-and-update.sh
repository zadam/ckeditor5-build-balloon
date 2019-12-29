#!/usr/bin/env bash

npm run build

# pointing the source map file to correct location
sed -i -e 's/sourceMappingURL=ckeditor.js.map/sourceMappingURL=libraries\/ckeditor\/ckeditor.js.map/g' build/ckeditor.js

cp build/ckeditor.* ~/trilium/libraries/ckeditor/

cp node_modules/@ckeditor/ckeditor5-inspector/build/inspector.js ~/trilium/libraries/ckeditor/
