/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module attributeautocomplete/attributeautocompletecommand
 */

import Command from '@ckeditor/ckeditor5-core/src/command';
import toMap from '@ckeditor/ckeditor5-utils/src/tomap';
import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';
import { _addAttributeAutocompleteAttributes } from './attributeautocompleteediting.js';

/**
 * The mention command.
 *
 * The command is registered by {@link module:mention/mentionediting~MentionEditing} as `'mention'`.
 *
 * To insert a mention onto a range, execute the command and specify a mention object with a range to replace:
 *
 *		const focus = editor.model.document.selection.focus;
 *
 *		// It will replace one character before the selection focus with the '#1234' text
 *		// with the mention attribute filled with passed attributes.
 *		editor.execute( 'mention', {
 *			marker: '#',
 *			mention: {
 *				id: '#1234',
 *				name: 'Foo',
 *				title: 'Big Foo'
 *			},
 *			range: model.createRange( focus, focus.getShiftedBy( -1 ) )
 *		} );
 *
 *		// It will replace one character before the selection focus with the 'The "Big Foo"' text
 *		// with the mention attribute filled with passed attributes.
 *		editor.execute( 'mention', {
 *			marker: '#',
 *			mention: {
 *				id: '#1234',
 *				name: 'Foo',
 *				title: 'Big Foo'
 *			},
 *			text: 'The "Big Foo"',
 *			range: model.createRange( focus, focus.getShiftedBy( -1 ) )
 *		} );
 *
 * @extends module:core/command~Command
 */
export default class AttributeAutocompleteCommand extends Command {
	/**
	 * @inheritDoc
	 */
	refresh() {
		const model = this.editor.model;
		const doc = model.document;

		this.isEnabled = model.schema.checkAttributeInSelection( doc.selection, 'attributeautocomplete' );
	}

	/**
	 * Executes the command.
	 *
	 * @param {Object} [options] Options for the executed command.
	 * @param {Object|String} options.mention The mention object to insert. When a string is passed, it will be used to create a plain
	 * object with the name attribute that equals the passed string.
	 * @param {String} options.marker The marker character (e.g. `'@'`).
	 * @param {String} [options.text] The text of the inserted mention. Defaults to the full mention string composed from `marker` and
	 * `mention` string or `mention.id` if an object is passed.
	 * @param {String} [options.range] The range to replace. Note that the replaced range might be shorter than the inserted text with the
	 * mention attribute.
	 * @fires execute
	 */
	execute( options ) {
		const model = this.editor.model;
		const document = model.document;
		const selection = document.selection;

		const attributeAutocompleteData = typeof options.attributeautocomplete == 'string' ? { id: options.attributeautocomplete } : options.attributeautocomplete;
		const attributeAutocompleteID = attributeAutocompleteData.id;

		const range = options.range || selection.getFirstRange();

		const attributeAutocompleteText = options.text || attributeAutocompleteID;

		const attributeAutocomplete = _addAttributeAutocompleteAttributes( { _text: attributeAutocompleteText, id: attributeAutocompleteID }, attributeAutocompleteData );

		if ( options.marker.length != 1 ) {
			/**
			 * The marker must be a single character.
			 *
			 * Correct markers: `'@'`, `'#'`.
			 *
			 * Incorrect markers: `'$$'`, `'[@'`.
			 *
			 */
			throw new CKEditorError(
				'attributeautocompletecommand-incorrect-marker: The marker must be a single character.',
				this
			);
		}

		if ( attributeAutocompleteID.charAt( 0 ) != options.marker ) {
			/**
			 * The feed item ID must start with the marker character.
			 *
			 * Correct attributeautocomplete feed setting:
			 *
			 *		attributeautocomplete: [
			 *			{
			 *				marker: '@',
			 *				feed: [ '@Ann', '@Barney', ... ]
			 *			}
			 *		]
			 *
			 * Incorrect mention feed setting:
			 *
			 *		attributeautocomplete: [
			 *			{
			 *				marker: '@',
			 *				feed: [ 'Ann', 'Barney', ... ]
			 *			}
			 *		]
			 *
			 *
			 * @error mentioncommand-incorrect-id
			 */
			throw new CKEditorError(
				'attributeautocompletecommand-incorrect-id: The item id must start with the marker character.',
				this
			);
		}

		model.change( writer => {
			const currentAttributes = toMap( selection.getAttributes() );
			const attributesWithAttributeAutocomplete = new Map( currentAttributes.entries() );

			attributesWithAttributeAutocomplete.set( 'attributeautocomplete', attributeAutocomplete );

			// Replace a range with the text with a mention.
			model.insertContent( writer.createText( attributeAutocompleteText, attributesWithAttributeAutocomplete ), range );
			model.insertContent( writer.createText( ' ', currentAttributes ), range.start.getShiftedBy( attributeAutocompleteText.length ) );
		} );
	}
}
