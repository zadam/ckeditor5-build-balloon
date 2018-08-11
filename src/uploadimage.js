import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';

export default class UploadimagePlugin extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ FileRepository ];
	}

	static get pluginName() {
		return 'UploadimagePlugin';
	}

	init() {
		const url = "/api/image/upload";

		this.editor.plugins.get('FileRepository').createUploadAdapter = loader => new Adapter(loader);
	}
}

class Adapter {
	/**
	 * Creates a new adapter instance.
	 *
	 * @param {module:upload/filerepository~FileLoader} loader
	 */
	constructor(loader) {
		/**
		 * FileLoader instance to use during the upload.
		 *
		 * @member {module:upload/filerepository~FileLoader} #loader
		 */
		this.loader = loader;
	}

	/**
	 * Starts the upload process.
	 *
	 * @see module:upload/filerepository~Adapter#upload
	 * @returns {Promise}
	 */
	upload() {
		return new Promise((resolve, reject) => {
			this._initRequest();
			this._initListeners(resolve, reject);
			this._sendRequest();
		} );
	}

	/**
	 * Aborts the upload process.
	 *
	 * @see module:upload/filerepository~Adapter#abort
	 * @returns {Promise}
	 */
	abort() {
		if (this.xhr) {
			this.xhr.abort();
		}
	}

	/**
	 * Initializes the XMLHttpRequest object.
	 *
	 * @private
	 */
	_initRequest() {
		const xhr = this.xhr = new XMLHttpRequest();

		const node = glob.getCurrentNode();
		const noteId = node.data.noteId;

		const url = "/api/images?noteId=" + noteId;

		xhr.open('POST', url, true);
		xhr.responseType = 'json';

		const headers = glob.getHeaders();

		for (const headerName in headers) {
			xhr.setRequestHeader(headerName, headers[headerName]);
		}
	}

	/**
	 * Initializes XMLHttpRequest listeners.
	 *
	 * @private
	 * @param {Function} resolve Callback function to be called when the request is successful.
	 * @param {Function} reject Callback function to be called when the request cannot be completed.
	 */
	_initListeners(resolve, reject) {
		const xhr = this.xhr;
		const loader = this.loader;
		const genericError = 'Cannot upload file:' + ` ${loader.file.name}.`;

		xhr.addEventListener('error', () => reject(genericError));
		xhr.addEventListener('abort', () => reject());
		xhr.addEventListener('load', () => {
			const response = xhr.response;

			if (!response || !response.uploaded) {
				return reject(response && response.error && response.error.message ? response.error.message : genericError);
			}

			resolve({
				default: response.url
			});

			// only now the <img> tag is inserted, but CKEditor doesn't trigger change event
			glob.noteChanged();
		});

		// Upload progress when it's supported.
		/* istanbul ignore else */
		if (xhr.upload) {
			xhr.upload.addEventListener('progress', evt => {
				if (evt.lengthComputable) {
					loader.uploadTotal = evt.total;
					loader.uploaded = evt.loaded;
				}
			});
		}
	}

	/**
	 * Prepares the data and sends the request.
	 *
	 * @private
	 */
	_sendRequest() {
		// Prepare form data.
		const data = new FormData();
		data.append('upload', this.loader.file);

		// Send request.
		this.xhr.send(data);
	}
}
