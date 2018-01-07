import Text from '@ckeditor/ckeditor5-engine/src/model/text';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

export default class InserttextPlugin extends Plugin {
	init() {
		const editor = this.editor;

		editor.data.insertLink = function( linkText, linkHref ) {
			const text = new Text( linkText, { linkHref } );

			editor.data.insertContent( text, editor.document.selection );
		};

		editor.data.insertText = function( str ) {
			const text = new Text( str );

			editor.data.insertContent( text, editor.document.selection );
		};
	}
}
