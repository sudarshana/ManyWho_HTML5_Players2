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

    var boxviewer = React.createClass({

        componentDidMount: function () {

            var model = manywho.model.getComponent(this.props.id, this.props.flowKey);

            var assets = model.contentValue;

            var viewer = Crocodoc.createViewer('.viewer', {
                url: assets
            });
            viewer.load();

        },

        render: function () {

            var classes = manywho.styling.getClasses(this.props.parentId, this.props.id, 'box_viewer', this.props.flowKey);

            classes += ' viewer';

            return React.DOM.div({ className: classes });

        }

    });

    manywho.component.register("box_viewer", boxviewer);

}(manywho));