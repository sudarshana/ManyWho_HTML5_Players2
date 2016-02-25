/*!
Copyright 2015 ManyWho, Inc.
Licensed under the ManyWho License, Version 1.0 (the "License"); you may not use this
file except in compliance with the License.
You may obtain a copy of the License at: http://manywho.com/sharedsource
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied. See the License for the specific language governing
permissions and limitations under the License.
*/

(function (manywho, window) {

    var content = React.createClass({

        skipSetContent: false,

        getInitialState: function() {

            return {
                isImageUploadOpen: false
            }

        },

        getActiveItems: function() {

            var activeItems = [];
            var settings = manywho.settings.global('richText.toolbar');

            ReactQuill.Toolbar.defaultItems.forEach(function(item) {

                var group = { label: item.label, type: item.type };

                item.items.forEach(function(subItem) {

                    if (manywho.utils.isEqual(subItem.type, 'font', true)) {

                        subItem.items = manywho.settings.global('richText.fonts');

                    }

                    if (settings.indexOf(subItem.type) > -1) {

                        if (!group.items)
                            group.items = [];

                        group.items.push(subItem);

                    }

                });

                if (group.items)
                    activeItems.push(group);

            });

            return activeItems;

        },

        handleChange: function (content, delta, source, editor) {

            if (content.length > 10)
                return false;

            manywho.state.setComponent(this.props.id, { contentValue: content }, this.props.flowKey, true);

        },

        handleEvent: function (e) {

            manywho.component.handleEvent(this, manywho.model.getComponent(this.props.id, this.props.flowKey), this.props.flowKey);

        },

        renderFileDialog: function () {

            var tableAttributes = {
                flowKey: this.props.flowKey,
                id: this.props.id,
                selectionEnabled: true
            };

            var uploadAttributes = {
                flowKey: this.props.flowKey,
                id: this.props.id,
                multiple: true
            };

            if (!this.props.isDesignTime) {
                tableAttributes = manywho.utils.extend(tableAttributes,  { onRowClicked: this.onFileTableRowClicked });
                uploadAttributes = manywho.utils.extend(tableAttributes,  { uploadComplete: this.onUploadComplete });
            }

            return React.DOM.div({ className: 'modal show' }, [
                React.DOM.div({ className: 'modal-dialog full-screen', onKeyUp: this.onEnter }, [
                    React.DOM.div({ className: 'modal-content full-screen' }, [
                        React.DOM.div({ className: 'modal-body' }, [
                            React.DOM.ul({ className: 'nav nav-tabs' }, [
                                React.DOM.li({ className: 'active' }, [
                                    React.DOM.a({ href: '#files', 'data-toggle': 'tab'}, 'File List')
                                ]),
                                React.DOM.li({ className: '' }, [
                                    React.DOM.a({ href: '#upload', 'data-toggle': 'tab'}, 'Direct Upload')
                                ])
                            ]),
                            React.DOM.div({ className: 'tab-content'}, [
                                React.DOM.div({ className: 'tab-pane active', id: 'files'}, [
                                    React.createElement(manywho.component.getByName('table'), tableAttributes)
                                ]),
                                React.DOM.div({  className: 'tab-pane', id: 'upload'}, [
                                    React.createElement(manywho.component.getByName('file-upload'), uploadAttributes)
                                ])
                            ])
                        ]),
                        React.DOM.div({ className: 'modal-footer' }, [
                            React.DOM.button({ className: 'btn btn-default', onClick: this.onFileCancel }, 'Cancel')
                        ])
                    ])
                ])
            ]);

        },

        onUploadComplete: function (response) {

            var imageUri = manywho.utils.getObjectDataProperty(response.objectData[0].properties, 'Download Uri');
            var imageName = manywho.utils.getObjectDataProperty(response.objectData[0].properties, 'Name');

            if (imageUri) {

                tinymce.activeEditor.execCommand('mceInsertContent', false, '<img src="' + imageUri.contentValue + '" alt="' + imageName.contentValue + '"/>');

                this.setState({ isImageUploadOpen: false });

            }

        },

        onFileCancel: function (event) {

            this.setState({ isImageUploadOpen: false });

        },

        onFileTableRowClicked: function (event) {

            var imageUri = event.currentTarget.lastChild.innerText;

            var imageName = event.currentTarget.firstChild.innerText;

            if (imageUri != null && imageUri.length > 0) {

                tinymce.activeEditor.execCommand('mceInsertContent', false, '<img src="' + imageUri + '" alt="' + imageName + '"/>');

                this.setState({ isImageUploadOpen: false });

            }

        },

        render: function () {

            manywho.log.info('Rendering Content: ' + this.props.id);

            var model = manywho.model.getComponent(this.props.id, this.props.flowKey);
            var state = manywho.state.getComponent(this.props.id, this.props.flowKey);
            var outcomes = manywho.model.getOutcomes(this.props.id, this.props.flowKey);
            var isValid = true;

            if (typeof model.isValid !== 'undefined' && model.isValid == false) {
                isValid = false;
            }

            var attributes = {
                id: this.props.id,
                placeholder: model.hintValue,
                defaultValue: state.contentValue,
                modules: { 'image-tooltip': true },
                toolbar: this.getActiveItems(),
                theme: 'snow',
                onChange: this.handleChange,
                style: {
                    width: model.width * 50 + 'px',
                    minHeight: 70 + (model.height * 40) + 'px'
                },
                styles: {
                    '.ql-editor': {
                        'width': model.width * 50 + 'px !important',
                        'min-height': (model.height * 40) + 'px !important'
                    }
                }
            };

            if (model.hasEvents)
                attributes.onBlur = this.handleEvent;

            if (!model.isEnabled)
                attributes.disabled = 'disabled';

            if (model.isRequired)
                attributes.required = '';

            if (!model.isEditable)
                attributes.readOnly = 'readonly';

            var classNames = [
                'form-group',
                (model.isVisible === false) ? 'hidden' : '',
                (isValid) ? '' : 'has-error'
            ]
            .concat(manywho.styling.getClasses(this.props.parentId, this.props.id, 'content', this.props.flowKey))
            .join(' ');

            if (this.state.isInitialized && state.contentValue && state.contentValue.length > 0 && !this.skipSetContent) {

                tinymce.get(this.props.id).setContent(state.contentValue);
                this.skipSetContent = false;

            }

            var childElements = [React.DOM.label({ htmlFor: this.props.id }, [
                    model.label,
                    (model.isRequired) ? React.DOM.span({ className: 'input-required' }, ' *') : null
                ]),
                React.createElement(ReactQuill, attributes, null),
                React.DOM.span({ className: 'help-block' }, model.validationMessage),
                outcomes && outcomes.map(function (outcome) {
                    return React.createElement(manywho.component.getByName('outcome'), { id: outcome.id, flowKey: this.props.flowKey });
                }, this)];

            if (this.state.isImageUploadOpen) {

                childElements.push(this.renderFileDialog());

            }

            return React.DOM.div({ className: classNames }, childElements);

        }

    });

    manywho.component.register('content', content);

}(manywho, window));
