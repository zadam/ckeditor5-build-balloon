/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module mention/mentionediting
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import uid from '@ckeditor/ckeditor5-utils/src/uid';

import AttributeAutocompleteCommand from './attributeautocompletecommand.js';

/**
 * The mention editing feature.
 *
 * It introduces the {@link module:mention/mentioncommand~MentionCommand command} and the `mention`
 * attribute in the {@link module:engine/model/model~Model model} which renders in the {@link module:engine/view/view view}
 * as a `<span class="mention" data-mention="@mention">`.
 *
 * @extends module:core/plugin~Plugin
 */
export default class AttributeAutocompleteEditing extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'AttributeAutocompleteEditing';
	}

	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;
		const model = editor.model;
		const doc = model.document;

		// Allow the attributeautocomplete attribute on all text nodes.
		model.schema.extend( '$text', { allowAttributes: 'attributeautocomplete' } );

		// Upcast conversion.
		editor.conversion.for( 'upcast' ).elementToAttribute( {
			view: {
				name: 'span',
				key: 'data-attributeautocomplete',
				classes: 'attributeautocomplete'
			},
			model: {
				key: 'attributeautocomplete',
				value: _toAttributeAutocompleteAttribute
			}
		} );

		// Downcast conversion.
		editor.conversion.for( 'downcast' ).attributeToElement( {
			model: 'attributeautocomplete',
			view: createViewAttributeAutocompleteElement
		} );
		editor.conversion.for( 'downcast' ).add( preventPartialAttributeAutocompleteDowncast );

		doc.registerPostFixer( writer => removePartialAttributeAutocompletePostFixer( writer, doc, model.schema ) );
		doc.registerPostFixer( writer => extendAttributeOnAttributeAutocompletePostFixer( writer, doc ) );
		doc.registerPostFixer( writer => selectionAttributeAutocompleteAttributePostFixer( writer, doc ) );

		editor.commands.add( 'attributeautocomplete', new AttributeAutocompleteCommand( editor ) );
	}
}

export function _addAttributeAutocompleteAttributes(baseAttributeAutocompleteData, data ) {
	return Object.assign( { _uid: uid() }, baseAttributeAutocompleteData, data || {} );
}

/**
 * Creates a mention attribute value from the provided view element and optional data.
 *
 * This function is exposed as
 * {@link module:mention/mention~Mention#toMentionAttribute `editor.plugins.get( 'Mention' ).toMentionAttribute()`}.
 *
 * @protected
 * @param {module:engine/view/element~Element} viewElementOrAttributeAutocomplete
 * @param {String|Object} [data] Mention data to be extended.
 * @returns {module:attributeautocomplete/attributeautocomplete~AttributeAutocompleteAttribute}
 */
export function _toAttributeAutocompleteAttribute(viewElementOrAttributeAutocomplete, data ) {
	const dataAttributeAutocomplete = viewElementOrAttributeAutocomplete.getAttribute( 'data-attributeautocomplete' );

	const textNode = viewElementOrAttributeAutocomplete.getChild( 0 );

	// Do not convert empty mentions.
	if ( !textNode ) {
		return;
	}

	const baseAttributeAutocompleteData = {
		id: dataAttributeAutocomplete,
		_text: textNode.data
	};

	return _addAttributeAutocompleteAttributes( baseAttributeAutocompleteData, data );
}

// A converter that blocks partial mention from being converted.
//
// This converter is registered with 'highest' priority in order to consume mention attribute before it is converted by
// any other converters. This converter only consumes partial mention - those whose `_text` attribute is not equal to text with mention
// attribute. This may happen when copying part of mention text.
//
// @param {module:engine/conversion/dwoncastdispatcher~DowncastDispatcher}
function preventPartialAttributeAutocompleteDowncast( dispatcher ) {
	dispatcher.on( 'attribute:attributeautocomplete', ( evt, data, conversionApi ) => {
		const attributeAutocomplete = data.attributeNewValue;

		if ( !data.item.is( 'textProxy' ) || !attributeAutocomplete ) {
			return;
		}

		const start = data.range.start;
		const textNode = start.textNode || start.nodeAfter;

		if ( textNode.data != attributeAutocomplete._text ) {
			// Consume item to prevent partial mention conversion.
			conversionApi.consumable.consume( data.item, evt.name );
		}
	}, { priority: 'highest' } );
}

// Creates a mention element from the mention data.
//
// @param {Object} mention
// @param {module:engine/view/downcastwriter~DowncastWriter} viewWriter
// @returns {module:engine/view/attributeelement~AttributeElement}
function createViewAttributeAutocompleteElement( attributeAutocomplete, viewWriter ) {
	// Do not convert empty attributes (lack of value means no mention).
	if (!attributeAutocomplete) {
		return;
	}

	const options = {
		id: attributeAutocomplete._uid,
		priority: 20
	};

	const attributes = {
		'href': '#' + attributeAutocomplete.path
	};

	const container = viewWriter.createContainerElement('span', {});
	const link = viewWriter.createAttributeElement('a', attributes, options);

	viewWriter.insert( viewWriter.createPositionAt( container, 0 ), viewWriter.createText('#') );
	viewWriter.insert( viewWriter.createPositionAt( container, 1 ), link );

	return container;

	// if ( !attributeAutocomplete ) {
	// 	return;
	// }
	//
	// const attributes = {
	// 	class: 'attributeautocomplete',
	// 	'data-attributeautocomplete': attributeAutocomplete.id
	// };
	//
	// const options = {
	// 	id: attributeAutocomplete._uid,
	// 	priority: 20
	// };
	//
	// return viewWriter.createAttributeElement( 'span', attributes, options );
}

// Model post-fixer that disallows typing with selection when the selection is placed after the text node with the mention attribute or
// before a text node with mention attribute.
//
// @param {module:engine/model/writer~Writer} writer
// @param {module:engine/model/document~Document} doc
// @returns {Boolean} Returns `true` if the selection was fixed.
function selectionAttributeAutocompleteAttributePostFixer( writer, doc ) {
	const selection = doc.selection;
	const focus = selection.focus;

	if ( selection.isCollapsed && selection.hasAttribute( 'attributeautocomplete' ) && shouldNotTypeWithAttributeAutocompleteAt( focus ) ) {
		writer.removeSelectionAttribute( 'attributeautocomplete' );

		return true;
	}
}

// Helper function to detect if mention attribute should be removed from selection.
// This check makes only sense if the selection has mention attribute.
//
// The mention attribute should be removed from a selection when selection focus is placed:
// a) after a text node
// b) the position is at parents start - the selection will set attributes from node after.
function shouldNotTypeWithAttributeAutocompleteAt( position ) {
	const isAtStart = position.isAtStart;
	const isAfterAttributeAutocomplete = position.nodeBefore && position.nodeBefore.is( 'text' );

	return isAfterAttributeAutocomplete || isAtStart;
}

// Model post-fixer that removes the mention attribute from the modified text node.
//
// @param {module:engine/model/writer~Writer} writer
// @param {module:engine/model/document~Document} doc
// @returns {Boolean} Returns `true` if the selection was fixed.
function removePartialAttributeAutocompletePostFixer( writer, doc, schema ) {
	const changes = doc.differ.getChanges();

	let wasChanged = false;

	for ( const change of changes ) {
		// Checks the text node on the current position.
		const position = change.position;

		if ( change.name == '$text' ) {
			const nodeAfterInsertedTextNode = position.textNode && position.textNode.nextSibling;

			// Checks the text node where the change occurred.
			wasChanged = checkAndFix( position.textNode, writer ) || wasChanged;

			// Occurs on paste inside a text node with mention.
			wasChanged = checkAndFix( nodeAfterInsertedTextNode, writer ) || wasChanged;
			wasChanged = checkAndFix( position.nodeBefore, writer ) || wasChanged;
			wasChanged = checkAndFix( position.nodeAfter, writer ) || wasChanged;
		}

		// Checks text nodes in inserted elements (might occur when splitting a paragraph or pasting content inside text with mention).
		if ( change.name != '$text' && change.type == 'insert' ) {
			const insertedNode = position.nodeAfter;

			for ( const item of writer.createRangeIn( insertedNode ).getItems() ) {
				wasChanged = checkAndFix( item, writer ) || wasChanged;
			}
		}

		// Inserted inline elements might break mention.
		if ( change.type == 'insert' && schema.isInline( change.name ) ) {
			const nodeAfterInserted = position.nodeAfter && position.nodeAfter.nextSibling;

			wasChanged = checkAndFix( position.nodeBefore, writer ) || wasChanged;
			wasChanged = checkAndFix( nodeAfterInserted, writer ) || wasChanged;
		}
	}

	return wasChanged;
}

// This post-fixer will extend the attribute applied on the part of the mention so the whole text node of the mention will have
// the added attribute.
//
// @param {module:engine/model/writer~Writer} writer
// @param {module:engine/model/document~Document} doc
// @returns {Boolean} Returns `true` if the selection was fixed.
function extendAttributeOnAttributeAutocompletePostFixer( writer, doc ) {
	const changes = doc.differ.getChanges();

	let wasChanged = false;

	for ( const change of changes ) {
		if ( change.type === 'attribute' && change.attributeKey != 'attributeautocomplete' ) {
			// Checks the node on the left side of the range...
			const nodeBefore = change.range.start.nodeBefore;
			// ... and on the right side of the range.
			const nodeAfter = change.range.end.nodeAfter;

			for ( const node of [ nodeBefore, nodeAfter ] ) {
				if ( isBrokenAttributeAutocompleteNode( node ) && node.getAttribute( change.attributeKey ) != change.attributeNewValue ) {
					writer.setAttribute( change.attributeKey, change.attributeNewValue, node );

					wasChanged = true;
				}
			}
		}
	}

	return wasChanged;
}

// Checks if a node has a correct mention attribute if present.
// Returns `true` if the node is text and has a mention attribute whose text does not match the expected mention text.
//
// @param {module:engine/model/node~Node} node The node to check.
// @returns {Boolean}
function isBrokenAttributeAutocompleteNode( node ) {
	if ( !node || !( node.is( 'text' ) || node.is( 'textProxy' ) ) || !node.hasAttribute( 'attributeautocomplete' ) ) {
		return false;
	}

	const text = node.data;
	const attributeAutocomplete = node.getAttribute( 'attributeautocomplete' );

	const expectedText = attributeAutocomplete._text;

	return text != expectedText;
}

// Fixes a mention on a text node if it needs a fix.
//
// @param {module:engine/model/text~Text} textNode
// @param {module:engine/model/writer~Writer} writer
// @returns {Boolean}
function checkAndFix( textNode, writer ) {
	if ( isBrokenAttributeAutocompleteNode( textNode ) ) {
		writer.removeAttribute( 'attributeautocomplete', textNode );

		return true;
	}

	return false;
}
