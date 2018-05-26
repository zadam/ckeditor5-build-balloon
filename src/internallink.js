import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import internalLinkIcon from './trilium.svg';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';

export default class InternalLinkPlugin extends Plugin {
	init() {
		const editor = this.editor;

		editor.ui.componentFactory.add( 'internalLink', locale => {
			const view = new ButtonView( locale );

			view.set( {
				label: 'Internal Trilium link (CTRL-L)',
				icon: internalLinkIcon,
				tooltip: true
			} );

			// Callback executed once the image is clicked.
			view.on( 'execute', () => {
				glob.showAddLinkDialog();
			} );

			return view;
		} );
	}
}
