import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import {toWidget} from '@ckeditor/ckeditor5-widget/src/utils';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import Command from '@ckeditor/ckeditor5-core/src/command';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import noteIcon from './icons/note.svg';

export default class IncludeNote extends Plugin {
	static get requires() {
		return [ IncludeNoteEditing, IncludeNoteUI ];
	}
}

class IncludeNoteUI extends Plugin {
	init() {
		const editor = this.editor;
		const t = editor.t;

		// The "includeNote" button must be registered among the UI components of the editor
		// to be displayed in the toolbar.
		editor.ui.componentFactory.add( 'includeNote', locale => {
			// The state of the button will be bound to the widget command.
			const command = editor.commands.get( 'insertIncludeNote' );

			// The button will be an instance of ButtonView.
			const buttonView = new ButtonView( locale );

			buttonView.set( {
				// The t() function helps localize the editor. All strings enclosed in t() can be
				// translated and change when the language of the editor changes.
				label: t( 'Include note' ),
				icon: noteIcon,
				tooltip: true
			} );

			// Bind the state of the button to the command.
			buttonView.bind( 'isOn', 'isEnabled' ).to( command, 'value', 'isEnabled' );

			// Execute the command when the button is clicked (executed).
			this.listenTo( buttonView, 'execute', () => editor.execute( 'insertIncludeNote' ) );

			return buttonView;
		} );
	}
}

class IncludeNoteEditing extends Plugin {
	static get requires() {
		return [ Widget ];
	}

	init() {
		this._defineSchema();
		this._defineConverters();

		this.editor.commands.add( 'insertIncludeNote', new InsertIncludeNoteCommand( this.editor ) );
	}

	_defineSchema() {
		const schema = this.editor.model.schema;

		schema.register( 'includeNote', {
			// Behaves like a self-contained object (e.g. an image).
			isObject: true,

			allowAttributes: 'noteId',

			// Allow in places where other blocks are allowed (e.g. directly in the root).
			allowWhere: '$block'
		} );
	}

	_defineConverters() {
		const editor = this.editor;
		const conversion = editor.conversion;

		// <includeNote> converters
		conversion.for( 'upcast' ).elementToElement( {
			model: ( viewElement, modelWriter ) => {
				return modelWriter.createElement( 'includeNote', {
					noteId: viewElement.getAttribute('data-note-id')
				} );
			},
			view: {
				name: 'section',
				classes: 'include-note'
			}
		} );
		conversion.for( 'dataDowncast' ).elementToElement( {
			model: 'includeNote',
			view: ( modelElement, viewWriter ) => {
				// it would make sense here to downcast to <iframe>, with this even HTML export can support note inclusion
				return viewWriter.createContainerElement('section', {
					class: 'include-note',
					'data-note-id': modelElement.getAttribute('noteId')
				});
			}
		} );
		conversion.for( 'editingDowncast' ).elementToElement( {
			model: 'includeNote',
			view: ( modelElement, viewWriter ) => {

				const noteId = modelElement.getAttribute('noteId');

				const section = viewWriter.createContainerElement( 'section', {
					class: 'include-note',
					'data-note-id': noteId
				} );

				const includedNoteWrapper = viewWriter.createUIElement( 'div', {
					class: 'include-note-wrapper'
				}, function( domDocument ) {
					const domElement = this.toDomElement( domDocument );

					const editorEl = editor.editing.view.getDomRoot();
					const component = glob.getComponentByEl(editorEl);

					component.loadIncludedNote(noteId, domElement);

					return domElement;
				} );

				viewWriter.insert( viewWriter.createPositionAt( section, 0 ), includedNoteWrapper );

				return toWidget( section, viewWriter, { label: 'include note widget' } );
			}
		} );
	}
}

class InsertIncludeNoteCommand extends Command {
	execute() {
		const editorEl = this.editor.editing.view.getDomRoot();
		const component = glob.getComponentByEl(editorEl);

		component.triggerCommand('addIncludeNoteToText');
	}

	refresh() {
		const model = this.editor.model;
		const selection = model.document.selection;
		const allowedIn = model.schema.findAllowedParent( selection.getFirstPosition(), 'includeNote' );

		this.isEnabled = allowedIn !== null;
	}
}
