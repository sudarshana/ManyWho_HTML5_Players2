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

    var main = React.createClass({

        mixins: [manywho.component.mixins.enterKeyHandler],

        componentDidMount: function() {

            manywho.utils.removeLoadingIndicator('loader');

            window.addEventListener("beforeunload", function (event) {

                manywho.engine.sync(this.props.flowKey);

            }.bind(this));


        },

        componentDidUpdate: function() {

            if (!manywho.utils.isEmbedded()) {

                var main = this.refs.main.getDOMNode();
                var nav = this.refs.nav.getDOMNode();

                var height = main.clientHeight + ((nav) ? nav.clientHeight : 0);

                if (height <= window.innerHeight) {

                    document.body.style.height = "100%";
                    document.documentElement.style.height = "100%";

                }
                else {

                    document.body.style.height = "auto";
                    document.documentElement.style.height = "auto";

                }

            }

        },

        render: function () {

            manywho.log.info("Rendering Main");

            var children = manywho.model.getChildren('root', this.props.flowKey);
            var outcomes = manywho.model.getOutcomes('root', this.props.flowKey);
            var state = manywho.state.getComponent('main', this.props.flowKey) || {};

            if (state && state.loading == null && !manywho.utils.isEqual(manywho.model.getInvokeType(this.props.flowKey), 'sync', true)) {

                manywho.component.focusInput(this.props.flowKey);

            }

            var componentElements = manywho.component.getChildComponents(children, this.props.id, this.props.flowKey);
            var outcomeElements = manywho.component.getOutcomes(outcomes, this.props.flowKey);

            var attributes = manywho.model.getAttributes(this.props.flowKey);

            if (attributes && manywho.utils.isEqual(attributes.outcomes, "fixed", true)) {

                var isMounted = React.findDOMNode(this.refs.container) != null;

                outcomeElements = React.createElement(manywho.component.getByName('footer'), { flowKey: this.props.flowKey, container: this.refs.container, isMounted: isMounted }, outcomeElements);

            }

            var isFullWidth = manywho.settings.global('isFullWidth', this.props.flowKey, false);

            var classNames = [
                'main',
                (isFullWidth) ? 'container-fluid full-width' : 'container',
                (manywho.settings.isDebugEnabled(this.props.flowKey)) ? 'main-debug' : '',
                (manywho.settings.global('history', this.props.flowKey)) ? 'main-history': '',
                (attributes && manywho.utils.isEqual(attributes.outcomes, "fixed", true)) ? 'has-footer': ''
            ];

            return React.DOM.div({ className: 'full-height clearfix', ref: 'container' }, [
                        React.createElement(manywho.component.getByName('navigation'), { id: manywho.model.getDefaultNavigationId(this.props.flowKey), flowKey: this.props.flowKey, ref: 'nav' }),
                        React.DOM.div({ className: classNames.join(' '), onKeyUp: this.onEnter, ref: 'main' }, [
                            React.DOM.h2({ className: 'page-label' }, manywho.model.getLabel(this.props.flowKey)),
                            componentElements,
                            outcomeElements,
                            React.createElement(manywho.component.getByName('status'), { flowKey: this.props.flowKey }),
                            React.createElement(manywho.component.getByName('voting'), { flowKey: this.props.flowKey }),
                            React.createElement(manywho.component.getByName('feed'), { flowKey: this.props.flowKey })
                        ]),
                        React.createElement(manywho.component.getByName('debug'), { flowKey: this.props.flowKey }),
                        React.createElement(manywho.component.getByName('history'), { flowKey: this.props.flowKey }),
                        React.createElement(manywho.component.getByName('notifications'), { flowKey: this.props.flowKey, position: 'left' }),
                        React.createElement(manywho.component.getByName('notifications'), { flowKey: this.props.flowKey, position: 'center' }),
                        React.createElement(manywho.component.getByName('notifications'), { flowKey: this.props.flowKey, position: 'right' }),
                        React.createElement(manywho.component.getByName('wait'), { isVisible: state.loading, message: state.loading && state.loading.message }, null)
                    ]);

        }

    });

    manywho.component.register('main', main, ['mw-main']);


}(manywho));
