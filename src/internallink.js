import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import internalLinkIcon from './icons/trilium.svg';
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

            // enable internal link only if the editor is not read only
			view.bind('isEnabled').to(editor, 'isReadOnly', isReadOnly => !isReadOnly);

			view.on( 'execute', () => {
				const editorEl = editor.editing.view.getDomRoot();
				const component = glob.getComponentByEl(editorEl);

				component.triggerCommand('addLinkToText');
			} );

			return view;
		} );
	}
}
