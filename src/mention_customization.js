export default function MentionCustomization(editor) {
	// Downcast the model 'mention' text attribute to a view <a> element.
	editor.conversion.for('downcast').attributeToElement({
		model: 'mention',
		view: (modelAttributeValue, viewWriter) => {
			// Do not convert empty attributes (lack of value means no mention).
			if (!modelAttributeValue) {
				return;
			}

			return viewWriter.createAttributeElement('a', { 'href': '#' + modelAttributeValue.path });
		},
		converterPriority: 'high'
	});
}
