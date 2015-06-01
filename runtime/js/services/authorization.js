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

manywho.authorization = (function (manywho) {

    return {

        setAuthenticationToken: function (callback, flowKey, response) {

            var authenticationToken = response.outputs.filter(function (output) {

                return manywho.utils.isEqual(output.developerName, 'AuthenticationToken', true);

            }).map(function (output) {

                return output.contentValue;

            })[0];

            manywho.state.setAuthenticationToken(authenticationToken, flowKey);

        },

        isAuthorized: function(response, flowKey) {

            return !(response.authorizationContext != null
                && response.authorizationContext.directoryId != null
                && manywho.utils.isNullOrWhitespace(manywho.state.getAuthenticationToken(flowKey)));

        },

        invokeAuthorization: function (response, flowKey, doneCallback) {

            // Check to see if the user has successfully authenticated
            if (response.authorizationContext != null && response.authorizationContext.directoryId != null) {

                if (manywho.utils.isEqual(response.authorizationContext.authenticationType, 'oauth2', true)) {

                    window.location = response.authorizationContext.loginUrl;
                    return;

                }

                manywho.state.setLoading('main', { message: 'Executing...' }, flowKey);
                manywho.engine.render(flowKey);

                var authenticationFlow = {
                    key: null,
                    id: null,
                    versionId: null
                };

                var self = this;

                manywho.ajax.getFlowByName('MANYWHO__AUTHENTICATION__DEFAULT__FLOW', manywho.settings.global('adminTenantId'))
                    .then(function (data) {

                        authenticationFlow.id = data.id.id;
                        authenticationFlow.versionId = data.id.versionId;

                        var inputObject = {
                            loginUrl: response.authorizationContext.loginUrl,
                            ManyWhoTenantId: manywho.utils.extractTenantId(flowKey),
                            DirectoryName: response.authorizationContext.directoryName,
                            StateId: manywho.utils.extractStateId(flowKey)
                        };

                        var inputData = manywho.json.generateFlowInputs(inputObject);
                        var requestData = manywho.json.generateInitializationRequest(data.id, null, null, inputData, manywho.settings.global('playerUrl'), manywho.settings.global('joinUrl'));

                        return manywho.ajax.initialize(requestData, manywho.settings.global('adminTenantId'));

                    })
                    .then(function(response) {

                        authenticationFlow.key = manywho.utils.getFlowKey(manywho.settings.global('adminTenantId'), authenticationFlow.id, authenticationFlow.versionId, response.stateId, 'modal');

                        manywho.model.initializeModel(authenticationFlow.key);

                        // When the authentication flow is "DONE" call setAuthenticationToken
                        manywho.callbacks.register(authenticationFlow.key, {
                            execute: self.setAuthenticationToken,
                            type: 'done',
                            args: [flowKey]
                        });

                        // Then execute the callback that we were given
                        manywho.callbacks.register(authenticationFlow.key, doneCallback);

                        var invokeRequest = manywho.json.generateInvokeRequest({
                            id: response.stateId,
                            token: response.stateToken,
                            currentMapElementId: response.currentMapElementId
                        }, 'FORWARD');

                        return manywho.ajax.invoke(invokeRequest, manywho.settings.global('adminTenantId'));

                    })
                    .then(function (response) {

                        manywho.engine.parseResponse(response, manywho.model.parseEngineResponse, authenticationFlow.key);

                    })
                    .then(function () {

                        manywho.state.setLoading('main', null, flowKey);
                        manywho.model.setModal(flowKey, authenticationFlow.key);
                        manywho.engine.render(flowKey);

                    })

            }

        },

        authorizeBySession: function (loginUrl, flowKey, doneCallback) {

            var requestData = manywho.json.generateSessionRequest(manywho.state.getSessionData(flowKey).id, manywho.state.getSessionData(flowKey).url, loginUrl);
            var state = manywho.state.getState(flowKey);

            manywho.callbacks.register(flowKey, doneCallback);

            manywho.ajax.sessionAuthentication(manywho.utils.extractTenantId(flowKey), state.id, requestData)
                .then(function (response) {

                    manywho.state.setAuthenticationToken(response, flowKey);
                    manywho.callbacks.execute(flowKey, 'done', null, [response]);

                });

        }

    }

})(manywho);