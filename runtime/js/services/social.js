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

manywho.social = (function (manywho) {

    var streams = {}

    return {

        initialize: function(flowKey, streamId) {

            manywho.state.setComponentLoading('feed', { message: manywho.settings.global('localization.loading') }, flowKey);

            var tenantId = manywho.utils.extractTenantId(flowKey);
            var stateId = manywho.utils.extractStateId(flowKey);
            var authenticationToken = manywho.state.getAuthenticationToken(flowKey);

            streams[flowKey] = {
                id: streamId
            };

            return manywho.ajax.getSocialMe(tenantId, streamId, stateId, authenticationToken)
                .then(function (response) {

                    streams[flowKey].me = response;

                    return manywho.ajax.getSocialFollowers(tenantId, streamId, stateId, authenticationToken);

                })
                .then(function (response) {

                    streams[flowKey].followers = response;

                    return manywho.ajax.getSocialMessages(tenantId, streamId, stateId, 1, 10, authenticationToken);

                })
                .then(function (response) {

                    streams[flowKey].messages = response;

                    manywho.state.setComponentLoading('feed', null, flowKey);
                    manywho.engine.render(flowKey);

                });

        },

        getStream: function(flowKey) {

            return streams[flowKey];

        },

        refreshMessages: function(flowKey) {

            manywho.state.setComponentLoading('feed', { message: manywho.settings.global('localization.loading') }, flowKey);
            manywho.engine.render(flowKey);

            var tenantId = manywho.utils.extractTenantId(flowKey);
            var stateId = manywho.utils.extractStateId(flowKey);
            var authenticationToken = manywho.state.getAuthenticationToken(flowKey);
            var streamId = streams[flowKey].id;

            return manywho.ajax.getSocialMessages(tenantId, streamId, stateId, 1, 10, authenticationToken)
                .then(function (response) {

                    streams[flowKey].messages = response;

                    manywho.state.setComponentLoading('feed', null, flowKey);
                    manywho.engine.render(flowKey);

                });

        },

        getMessages: function(flowKey) {

            manywho.state.setComponentLoading('feed', { message: manywho.settings.global('localization.loading') }, flowKey);
            manywho.engine.render(flowKey);

            var tenantId = manywho.utils.extractTenantId(flowKey);
            var stateId = manywho.utils.extractStateId(flowKey);
            var authenticationToken = manywho.state.getAuthenticationToken(flowKey);
            var streamId = streams[flowKey].id;

            return manywho.ajax.getSocialMessages(tenantId, streamId, stateId, streams[flowKey].messages.nextPage, 10, authenticationToken)
                .then(function (response) {

                    streams[flowKey].messages.messages = streams[flowKey].messages.messages.concat(response.messages);
                    streams[flowKey].messages.nextPage = response.nextPage;

                    manywho.state.setComponentLoading('feed', null, flowKey);
                    manywho.engine.render(flowKey);

                });

        },

        sendMessage: function (flowKey, message, repliedTo, mentionedUsers, attachments) {

            if (manywho.utils.isNullOrWhitespace(message)) {

                return;

            }

            var tenantId = manywho.utils.extractTenantId(flowKey);
            var stateId = manywho.utils.extractStateId(flowKey);
            var authenticationToken = manywho.state.getAuthenticationToken(flowKey);
            var stream = streams[flowKey];

            var request = {
                mentionedWhos: manywho.utils.convertToArray(mentionedUsers),
                messageText: message,
                senderId: stream.me.id,
                uploadedFiles: attachments
            }

            if (repliedTo) {

                request.repliedTo = repliedTo;

            }

            request.messageText = request.messageText.replace(/@\[[A-za-z0-9 ]*\]/ig, function (match) {

                return match.substring(2, match.length - 1);

            });

            manywho.state.setComponentLoading('feed', { message: manywho.settings.global('localization.sending') }, flowKey);
            manywho.engine.render(flowKey);

            return manywho.ajax.sendSocialMessage(tenantId, stream.id, stateId, request, authenticationToken)
                .then(function (response) {

                    if (repliedTo) {

                        var repliedToMessage = stream.messages.messages.filter(function (message) {

                            return message.id == repliedTo;

                        })[0];

                        repliedToMessage.comments = repliedToMessage.comments || [];
                        repliedToMessage.comments.push(response);

                    }
                    else {

                        stream.messages.messages = stream.messages.messages || [];
                        stream.messages.messages.unshift(response);

                    }

                    manywho.collaboration.syncFeed(flowKey);

                    manywho.state.setComponentLoading('feed', null, flowKey);
                    manywho.engine.render(flowKey);

                });

        },

        toggleFollow: function(flowKey) {

            var tenantId = manywho.utils.extractTenantId(flowKey);
            var stateId = manywho.utils.extractStateId(flowKey);
            var authenticationToken = manywho.state.getAuthenticationToken(flowKey);
            var stream = streams[flowKey];

            manywho.state.setComponentLoading('feed', { message: manywho.settings.global('localization.loading') }, flowKey);
            manywho.engine.render(flowKey);

            return manywho.ajax.follow(tenantId, stream.id, stateId, !stream.me.isFollower, authenticationToken)
                .then(function (response) {

                    stream.me.isFollower = !stream.me.isFollower;

                    return manywho.ajax.getSocialFollowers(tenantId, stream.id, stateId, authenticationToken)

                })
                .then(function (response) {

                    streams[flowKey].followers = response;

                    manywho.state.setComponentLoading('feed', null, flowKey);
                    manywho.engine.render(flowKey);

                });

        },

        getUsers: function (flowKey, name) {

            var tenantId = manywho.utils.extractTenantId(flowKey);
            var stateId = manywho.utils.extractStateId(flowKey);
            var authenticationToken = manywho.state.getAuthenticationToken(flowKey);
            var stream = streams[flowKey];

            return manywho.ajax.getSocialUsers(tenantId, stream.id, stateId, name, authenticationToken);

        },

        attachFiles: function (flowKey, formData, progress) {

            var tenantId = manywho.utils.extractTenantId(flowKey);
            var authenticationToken = manywho.state.getAuthenticationToken(flowKey);
            var stream = streams[flowKey];

            return manywho.ajax.uploadSocialFile(formData, stream.id, tenantId, authenticationToken, progress);

        },

        remove: function(flowKey) {

            streams[flowKey] == null;
            delete streams[flowKey];

        }

    }

})(manywho);
