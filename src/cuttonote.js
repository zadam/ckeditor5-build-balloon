import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import scissorsIcon from './scissors.svg';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import HtmlDataProcessor from '@ckeditor/ckeditor5-engine/src/dataprocessor/htmldataprocessor';

export default class CutToNotePlugin extends Plugin {
	init() {
		this.htmlDataProcessor = new HtmlDataProcessor();

		this.editor.ui.componentFactory.add( 'cutToNote', locale => {
			const view = new ButtonView( locale );

			view.set( {
				label: 'Cut & paste selection to sub-note',
				icon: scissorsIcon,
				tooltip: true
			} );

			// Callback executed once the image is clicked.
			view.on('execute', window.glob.createNoteInto);

			return view;
		} );

		window.cutToNote = {
			getSelectedHtml: () => this.getSelectedHtml(),
			removeSelection: () => this.removeSelection()
		};
	}

	getSelectedHtml() {
		const model = this.editor.model;
		const document = model.document;

		const content = this.editor.data.toView(model.getSelectedContent(document.selection));

		return this.htmlDataProcessor.toData(content);
	}

	removeSelection() {
		const model = this.editor.model;

		model.deleteContent(model.document.selection);
	}
}
