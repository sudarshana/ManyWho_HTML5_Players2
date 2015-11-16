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

(function (manywho) {

    function getInputType(contentType) {

        switch(contentType.toUpperCase())
        {
            case manywho.component.contentTypes.string:
                return 'text';
            case manywho.component.contentTypes.number:
                return 'number';
            case manywho.component.contentTypes.boolean:
                return 'checkbox';
            case manywho.component.contentTypes.password:
                return 'password';
            case manywho.component.contentTypes.datetime:
                return 'datetime';
            default:
                return 'text';
        }

    }

    function isEmptyDate(date) {

        if (date == null
            || date.indexOf('01/01/0001') != -1
            || date.indexOf('1/1/0001') != -1
            || date.indexOf('0001-01-01') != -1) {

            return true;

        }

        return false;

    }

    function parseValue(value, maxSize) {

        if (value != null) {

            value = value.replace(/^\s+|\s+$/g, '');

            if (manywho.utils.isNullOrWhitespace(value))
                return value;

            var max = (Math.pow(10, maxSize)) - 1;
            var min = (Math.pow(10, maxSize) * -1) + 1;
            var parsedValue = parseFloat(value);

            parsedValue = Math.min(parsedValue, max);
            return Math.max(parsedValue, min);

        }

        return null;

    }

    var input = React.createClass({

        componentDidMount: function () {

            var model = manywho.model.getComponent(this.props.id, this.props.flowKey);
            var state = manywho.state.getComponent(this.props.id, this.props.flowKey);

            if (manywho.utils.isEqual(model.contentType, manywho.component.contentTypes.datetime, true)) {

                var stateDate = null;
                var datepickerElement = this.refs.datepicker.getDOMNode();

                $(datepickerElement).datetimepicker({
                    locale: model.attributes.dateTimeLocale || 'en-us',
                    format: model.attributes.dateTimeFormat || 'MM/DD/YYYY'
                })
                .on('dp.change', this.handleChange);

                if (isEmptyDate(state.contentValue)) {

                    manywho.state.setComponent(this.props.id, { contentValue: null }, this.props.flowKey, true);

                }
                else {

                    stateDate = moment(state.contentValue, ["MM/DD/YYYY hh:mm:ss A ZZ", moment.ISO_8601]);
                    manywho.state.setComponent(this.props.id, { contentValue: stateDate.format() }, this.props.flowKey, true);
                    $(datepickerElement).data("DateTimePicker").date(stateDate);
                }



            }

        },

        componentWillUnmount: function () {

            if (this.refs.datepicker) {

                $(this.refs.datepicker.getDOMNode()).data('DateTimePicker').destroy();

            }

        },

        getInitialState: function() {

            return {
                value: null
            }

        },

        handleChange: function (e) {

            var model = manywho.model.getComponent(this.props.id, this.props.flowKey);

            if (manywho.utils.isEqual(model.contentType, manywho.component.contentTypes.boolean, true)) {

                manywho.state.setComponent(this.props.id, { contentValue: e.target.checked }, this.props.flowKey, true);

            }
            else if (manywho.utils.isEqual(model.contentType, manywho.component.contentTypes.number, true)
                    && e.target.validity && !e.target.validity.badInput) {

                var value = parseValue(e.target.value, model.maxSize);

                manywho.state.setComponent(this.props.id, { contentValue: value }, this.props.flowKey, true);
                this.setState({ value: value });

            }
            else if (manywho.utils.isEqual(model.contentType, manywho.component.contentTypes.datetime, true)) {

                var formats = [moment.ISO_8601, 'MM/DD/YYYY hh:mm:ss A ZZ'];
                if (model.attributes && model.attributes.dateTimeFormat) {
                    formats.push(model.attributes.dateTimeFormat);
                }

                var date = moment(e.target.value, formats);
                if (date.isValid()) {

                    manywho.state.setComponent(this.props.id, { contentValue: date.format() }, this.props.flowKey, true);

                }
                else {

                    manywho.state.setComponent(this.props.id, { contentValue: e.target.value }, this.props.flowKey, true);

                }

                this.setState({ value: e.target.value });

            }
            else {

                manywho.state.setComponent(this.props.id, { contentValue: e.target.value }, this.props.flowKey, true);

            }

            if (model.contentType.toUpperCase() == manywho.component.contentTypes.boolean) {

                this.handleEvent();

            }

            this.forceUpdate();

        },

        handleEvent: function () {

            manywho.component.handleEvent(this, manywho.model.getComponent(this.props.id, this.props.flowKey), this.props.flowKey);

        },

        render: function () {

            manywho.log.info('Rendering Input: ' + this.props.id);

            var model = manywho.model.getComponent(this.props.id, this.props.flowKey);
            var state = manywho.state.getComponent(this.props.id, this.props.flowKey);
            var isValid = true;
            var contentType = model.contentType || (model.valueElementValueBindingReferenceId && model.valueElementValueBindingReferenceId.contentType) || 'ContentString';
            var contentValue = (state && state.contentValue) || model.contentValue;

            var attributes = {
                type: !this.props.isDesignTime ? getInputType(contentType) : 'text',
                placeholder: model.hintValue,
                value: contentValue,
                id: this.props.id,
                maxLength: model.maxSize,
                size: model.size
            };

            if (!model.isEditable)
                attributes.readOnly = 'readonly';

            if (!this.props.isDesignTime) {

                attributes = manywho.utils.extend(attributes, { onChange: this.handleChange });

            } else if (!model.isEnabled) {

                attributes.disabled = 'disabled';

            }

            if (model.isRequired)
                attributes.required = '';

            if (typeof model.isValid !== 'undefined' && model.isValid == false)
                isValid = false;

            var containerClassNames = [
                (isValid) ? '' : 'has-error',
                (model.isVisible == false) ? 'hidden' : '',
                (manywho.utils.isEqual(contentType, 'ContentDateTime', true)) ? 'datetime-container' : ''
            ]
            .concat(manywho.styling.getClasses(this.props.parentId, this.props.id, 'input', this.props.flowKey))
            .join(' ');

            if (contentType.toUpperCase() == manywho.component.contentTypes.boolean) {

                if ((typeof contentValue == "string" && manywho.utils.isEqual(contentValue, "true", true)) || contentValue === true) {
                    attributes.checked = 'checked';
                }

                if (!model.isEditable) {
                    attributes.disabled = 'disabled';
                }

                return React.DOM.div({ className: containerClassNames},
                    [
                        React.DOM.div({ className: 'checkbox ' },
                            React.DOM.label(null, [
                                React.DOM.input(attributes, null),
                                model.label
                            ])
                        ),
                        React.DOM.span({className: 'help-block'}, model.validationMessage),
                        React.DOM.span({ className: 'help-block' }, model.helpInfo)
                    ]);

            } else {

                if (model.hasEvents && !this.props.isDesignTime) {
                    attributes.onBlur = this.handleEvent;
                }

                attributes.className = 'form-control ';

                if (contentType.toUpperCase() == manywho.component.contentTypes.datetime) {

                    attributes.className += 'datepicker';
                    attributes.ref = 'datepicker';
                    attributes.value = this.state.value;

                }
                else if (manywho.utils.isEqual(contentType, manywho.component.contentTypes.number, true)) {

                    attributes.style = { width: (15 * model.size) + "px !important" };
                    attributes.max = (Math.pow(10, Math.min(model.maxSize, 17))) - 1;
                    attributes.min = (Math.pow(10, Math.min(model.maxSize, 17)) * -1) + 1;
                    attributes.value = (null != this.state.value && this.state.value)
                                         || (null != contentValue && contentValue)
                                         || null;

                }

                return React.DOM.div({ className: 'form-group ' + containerClassNames },
                    [
                        React.DOM.label({ htmlFor: this.props.id }, [
                            model.label,
                            (model.isRequired) ? React.DOM.span({ className: 'input-required' }, ' *') : null
                        ]),
                        React.DOM.input(attributes, null),
                        React.DOM.span({ className: 'help-block' }, model.validationMessage),
                        React.DOM.span({ className: 'help-block' }, model.helpInfo)
                    ]);

            }

        }

    });

    manywho.component.register('input', input, ['checkbox']);

}(manywho));
