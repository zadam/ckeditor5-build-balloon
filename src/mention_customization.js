import Command from "@ckeditor/ckeditor5-core/src/command";

export default function MentionCustomization(editor) {
	setTimeout(() => {
		editor.commands.add('mention', new CustomMentionCommand(editor));
	}, 1000);
}

class CustomMentionCommand extends Command {
	execute(options) {
		const model = this.editor.model;
		const document = model.document;
		const selection = document.selection;

		const range = options.range || selection.getFirstRange();

		model.change(writer => {
			// override the selection or at least the beginning @ character
			model.insertContent(writer.createText(''), range);

			this.editor.execute('referenceLink', {notePath: options.mention.path});
		});
	}
}
