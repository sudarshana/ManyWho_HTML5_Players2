manywho.engine = (function (manywho) {

    function handleAuthorization(response) {

        // Check to see if the user has successfully authenticated
        if (manywho.utils.isEqual(response.statusCode, '401', true)) {

            if (manywho.utils.isEqual(response.authorizationContext.authenticationType, 'oauth2', true)) {
                // Navigate the user to the oauth provider
                window.location = response.authorizationContext.loginUrl;
                return false;
            }

            // TODO: throw up the login dialog to login to the directory
            alert('login!');

            // TODO: login to the flow like this to get the authentication token
            this.login(
                response.authorizationContext.loginUrl,
                'my username',
                'my password',
                manywho.settings.get('authentication.sessionid'),
                manywho.settings.get('authentication.sessionurl'),
                response.stateId
            );

            // TODO: set the authentication token
            manywho.state.setAuthenticationToken('the token');

            // TODO: restart whatever async sequence was tried before

            return false;
        }

        return true;

    }

    function update(response, responseParser, flowId) {

        if (handleAuthorization(response)) {

            responseParser.call(manywho.model, response, flowId);

            manywho.state.setState(response.stateId, response.stateToken, response.currentMapElementId);
            manywho.state.refreshComponents(manywho.model.getComponents(flowId));

            if (manywho.settings.get('replaceUrl')) {
                manywho.utils.replaceBrowserUrl(response);
            }

        }
    }

    function process(dispatcher, flowId) {

        var self = this;

        return dispatcher.then(function (response) {

            manywho.state.setState(response.stateId, response.stateToken, response.currentMapElementId);

            if (handleAuthorization(response)) {

                manywho.collaboration.initialize(manywho.settings.get('collaboration.isEnabled'));

                var defereds = [response];

                if (response.navigationElementReferences && response.navigationElementReferences.length > 0) {
                    defereds.push(manywho.ajax.getNavigation(response.stateId, response.stateToken, response.navigationElementReferences[0].id));
                }

                if (response.currentStreamId) {
                    // Add create social stream ajax call to deffereds here
                }

                return $.when.apply($, defereds);

            }

        })
        .then(function (response, navigation, stream) {

            manywho.model.parseNavigationResponse(response.navigationElementReferences[0].id, navigation[0], flowId);
            return manywho.ajax.invoke(manywho.json.generateInvokeRequest(
                manywho.state.getState(),
                'FORWARD',
                null,
                null,
                manywho.settings.get('annotations'),
                manywho.state.getGeoLocation(),
                manywho.settings.get('mode'))
            );

        })
        .then(function (response) {

            update(response, manywho.model.parseEngineResponse, flowId);
            self.render(flowId);

        });
        
    }

    return {

        initialize: function() {

            var flowId = manywho.settings.get('flowId');

            manywho.model.setTenantId(manywho.settings.get('tenantId'));

            manywho.state.initialize(manywho.settings.get('stateId'));
            manywho.state.setAuthenticationToken(manywho.settings.get('authentication.token'));

            if (manywho.state.getState().id) {

                process.call(this, manywho.ajax.join(manywho.state.getState().id)).then(function () {

                    manywho.collaboration.getValues(manywho.state.getState().id);

                });
                
            }
            else {

                var initializationRequest = manywho.json.generateInitializationRequest(
                    flowId,
                    manywho.state.getState().id,
                    manywho.settings.get('annotations'),
                    manywho.settings.get('inputs'),
                    manywho.settings.get('mode'),
                    manywho.settings.get('reportingMode')
                );

                process.call(this, manywho.ajax.initialize(initializationRequest), flowId.id);

            }

        },

        move: function(outcome, flowId) {

            // Validate all of the components on the page here...
            // In the model.js, there are componentInputResponseRequests entries for each component
            // that needs to be validated. If a component does not validate correctly, it should
            // prevent the 'move' and also indicate in the UI which component has failed validation

            var invokeRequest = manywho.json.generateInvokeRequest(
                manywho.state.getState(),
                'FORWARD',
                outcome.id,
                manywho.state.getPageComponentInputResponseRequests(),
                manywho.settings.get('annotations'),
                manywho.state.getGeoLocation(),
                manywho.settings.get('mode')
            );
            var self = this;

            manywho.ajax.invoke(invokeRequest).then(function (response) {

                update(response, manywho.model.parseEngineResponse, flowId);
                manywho.collaboration.move(manywho.state.getState().id);

                React.unmountComponentAtNode(document.getElementById('manywho'));
                self.render(flowId);

            });

        },

        sync: function(flowId) {

            // Validate all of the components on the page here...
            // In the model.js, there are componentInputResponseRequests entries for each component
            // that needs to be validated. If a component does not validate correctly, it should
            // prevent the 'move' and also indicate in the UI which component has failed validation

            var invokeRequest = manywho.json.generateInvokeRequest(
                manywho.state.getState(),
                'SYNC',
                null,
                manywho.state.getPageComponentInputResponseRequests(),
                manywho.settings.get('annotations'),
                manywho.state.getGeoLocation(),
                manywho.settings.get('mode')
            );
            var self = this;
            var componentIds = [];

            manywho.ajax.invoke(invokeRequest)
                .then(function (response) {
                    
                    update(response, manywho.model.parseEngineSyncResponse, flowId);
                    
                    var components = manywho.utils.convertToArray(manywho.model.getComponents()).filter(function(component) {

                        return component.objectDataRequest != null;

                    });

                    var requests = $.when.apply($, components.map(function(component) {

                        componentIds.push(component.pageComponentId);
                        manywho.state.setIsLoading(component.pageComponentId, true);

                        return manywho.ajax.dispatchObjectDataRequest(component.objectDataRequest);

                    // concat null here so that the response array is formatted as [response, response, ...]
                    }).concat(null));

                    self.render(flowId);

                    return requests;

                })
                .then(function () {
                    
                    var responses = Array.prototype.slice.call(arguments);
                    
                    for (var i = 0; i < componentIds.length; i++)
                    {
                        manywho.state.setIsLoading(componentIds[i], false);
                        manywho.model.getComponent(componentIds[i], flowId).objectData = responses[i][0].objectData;
                    }
                    
                    self.render(flowId);
                    
                });

        },

        join: function(stateId) {

            var dispatcher = manywho.ajax.join(stateId);
            React.unmountComponentAtNode(document.getElementById('manywho'));
            return process.call(this, dispatcher);

        },

        render: function (flowId) {

            var main = manywho.component.getByName('main');
            React.render(React.createElement(main, { flowId: flowId } ), document.getElementById('manywho'));

        }

    }

})(manywho);