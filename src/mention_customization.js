import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Command from '@ckeditor/ckeditor5-core/src/command';

export default class MentionCustomization extends Plugin {
	afterInit() {
		const editor = this.editor;
		// override standard mention command (see https://github.com/ckeditor/ckeditor5/issues/6470)
		editor.commands.add('mention', new CustomMentionCommand(editor));
	}
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
