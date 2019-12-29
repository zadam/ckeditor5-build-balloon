import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import markdownIcon from './icons/markdown-mark.svg';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';

export default class MarkdownImportPlugin extends Plugin {
	init() {
		const editor = this.editor;

		editor.ui.componentFactory.add( 'markdownImport', locale => {
			const view = new ButtonView( locale );

			view.set( {
				label: 'Markdown import from clipboard',
				icon: markdownIcon,
				tooltip: true
			} );

			// Callback executed once the image is clicked.
			view.on( 'execute', () => {
				glob.importMarkdownInline();
			} );

			return view;
		} );
	}
}
