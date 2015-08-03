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

    var input = React.createClass({

        componentWillMount: function () {

            var model = manywho.model.getComponent(this.props.id, this.props.flowKey);

            var self = this;

            return $.ajax({
                url: manywho.settings.global('platform.uri') + '/api/draw/1/' + model.attributes['typeElementId'],
                type: 'GET',
                dataType: 'json',
                contentType: 'application/json',
                beforeSend: function (xhr) {

                    beforeSend.call(this, xhr, manywho.utils.extractTenantId(self.props.flowKey), manywho.state.getAuthenticationToken(self.props.flowKey), 'test');

                }
            })
                .done(function (data) {

                    self.setState({ columns: data.properties });

                });

        },

        componentDidMount: function () {

            var model = manywho.model.getComponent(this.props.id, this.props.flowKey);
            var state = manywho.state.getComponent(this.props.id, this.props.flowKey);

        },

        handleChange: function (e) {



        },

        renderForm: function () {

            return this.state.columns.map(function (item) {

                if (item.contentType == 'ContentContent') {

                    return React.createElement('content', {});

                } else {

                    return React.createElement('input', {});

                }


            });

        },

        render: function () {

            manywho.log.info('Rendering Input: ' + this.props.id);

            var model = manywho.model.getComponent(this.props.id, this.props.flowKey);
            var state = manywho.state.getComponent(this.props.id, this.props.flowKey);

            var columns = this.renderForm();

            return React.DOM.div({ }, )

        }

    });

    manywho.component.register('form', input, ['form']);

}(manywho));
