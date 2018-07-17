/* global QiscusSDK, $, _ */
$(function () {
  var appSidebar = $('.app-sidebar__lists');
  var $createGroupSidebar = $('.app-sidebar.create-group');
  var $mainSidebar = $('.app-sidebar.main');
  var $createGroupNameSidebar = $('.app-sidebar.create-group-name');
  var $contactListSidebar = $('.app-sidebar.contact-list');
  var $chatStrangerSidebar = $('.app-sidebar.chat-stranger');
  var $addParticipantForm = $('.add-participant-form');

  $addParticipantForm.hide();

  var isLoggedIn = window.sessionStorage.getItem('sdk-sample-app---is-loggedin');
  var userData = null;
  if (!isLoggedIn || Boolean(isLoggedIn) !== true) {
    window.location.href = '/login.html';
  } else {
    userData = window.sessionStorage.getItem('sdk-sample-app---user-data');
    userData = JSON.parse(userData);
  }
  attachClickListenerOnConversation();
  loadContactList();
  // let's setup options for our widget
  QiscusSDK.core.init({
    AppId: window.SDK_APP_ID,
    mode: 'wide',
    templateFunction: function () { return '' },
    options: {
      avatar: false,
      // When we're success login into qiscus SDK we'll have a 1-on-1 chat to guest2@qiscus.com
      // You can change this to any user you have on your AppId, e.g: contact@your_company.com, etc
      loginSuccessCallback: function (response) {
        // QiscusSDK.core.UI.chatTarget('guest2@qiscus.com')
        // load Room List
        loadRoomList();

        // Join Qiscus AOV Room
        // QiscusSDK.core.getOrCreateRoomByUniqueId('Qiscus AOV');

        // Display UI in sidebar
        renderSidebarHeader();

        // attach event listeners;
        attachRoomInfoListener();
      },
      newMessagesCallback: function (messages) {
        loadRoomList();
        patchUnreadMessages(messages);
      },
      groupRoomCreatedCallback: function (data) {
        // Success creating group,
        // Reload room list
        loadRoomList();
        // Clear all selected target,
        $createGroupSidebar.find('.selected-participant-list').empty();
        $createGroupSidebar.find('.contact-item').removeClass('selected');
        // Hide all creating group sidebar,
        $createGroupSidebar.addClass('hidden');
        $createGroupNameSidebar.addClass('hidden');
        // Unhide main sidebar
        $mainSidebar.removeClass('hidden');
        // Open group room
        QiscusSDK.core.UI.chatGroup(data.id);
        // Hide empty state for the main view
        $('#empty-chat-wrapper').addClass('hidden');
      },
      chatRoomCreatedCallback: function (data) {
        // check if room already exists on sidebar
        var roomId = data.room.id;
        var isExists = $('#room-' + roomId).length > 0;
        if (!isExists) {
          var room = createRoomDOM(data.room);
          appSidebar.find('ul').prepend(room);
        }
        $chatStrangerSidebar.addClass('hidden');
        $chatStrangerSidebar.find('input[type="text"]').val('');
        $('#empty-chat-wrapper').addClass('hidden');
      },
      headerClickedCallback: function(data) {
        if(QiscusSDK.core.selected.room_type != 'group') return false;
        // display the room info modal
        $('#room-info').slideToggle('fast');
        // load room participants to the list
        renderParticipantList();
      },
    }
  });
  // login to qiscus
  QiscusSDK.core.setUser(userData.userId, userData.secret, userData.username);
  // render the widget
  QiscusSDK.render();

  function clearUnreadMessages (roomId) {
    var $targetRoomDOM = $('li#room-' + roomId + '');
    $targetRoomDOM.attr('data-sdk-unread-count', '0');
    $targetRoomDOM.find('.unread-count')
      .text('0')
    $targetRoomDOM.find('.unread-count')
      .addClass('hidden');
  }
  function patchUnreadMessages (messages) {
    var unreadMessages = messages.filter(function (message) {
      return message.email !== QiscusSDK.core.email;
    });
    unreadMessages.forEach(function (message) {
      var roomId = message.room_id;
      var $targetRoomDOM = $('li#room-' + roomId + '');
      var lastMessageId = $targetRoomDOM.attr('data-sdk-last-message-id') || 0;
      var lastUnreadCount = $targetRoomDOM.attr('data-sdk-unread-count') || 0;
      if (lastMessageId < message.id) {
        $targetRoomDOM
          .attr('data-sdk-last-message-id', message.id)
          .find('.last-message')
          .text(message.message);
      }
      $targetRoomDOM.attr('data-sdk-unread-count');
    });
    $('.room-item')
      .filter(function () {
        var unreadCount = $(this).attr('data-sdk-unread-count');
        return Number(unreadCount) > 0;
      })
      .toArray()
      .forEach(function (item) {
        var $this = $(item);
        var unreadCount = $this.attr('data-sdk-unread-count');
        // patch unread badge
        unreadCount = unreadCount > 9 ? '9+' : unreadCount;
        $this.find('.unread')
          .removeClass('hidden')
          .text(unreadCount);
      });
  }

  function loadRoomList() {
    QiscusSDK.core.loadRoomList()
        .then(function (rooms) {
          var lists = rooms.map(function (room) {
            return createRoomDOM(room);
          });
          appSidebar.find('ul').empty().append(lists);
          toggleConversationActiveClass();
        })
  }

  function renderParticipantList() {
    const members = QiscusSDK.core.selected.participants;
    let $members = '';
    members.forEach(member => {
      $members +=
        `<li>
          <img src="${member.avatar_url}" />
          <div>
            ${member.username}
            <small>${member.email}</small>
          </div>
          <button data-email="${member.email}">&times;</button>
        </li>`;
    })
    $('#room-info ul').empty().append($members);
  }

  function attachRoomInfoListener() {
    // add participant
    $('.sdk-wrapper').on('click', '.add-participant-btn', function(){
      $('.add-participant-form').slideToggle('fast');
    });
    // remove participant
    $('.sdk-wrapper').on('click', '#room-info li button', function(){
      // remove this participant
      QiscusSDK.core
        .removeParticipantsFromGroup(QiscusSDK.core.selected.id, [$(this).data('email')])
        .then(() => {
          renderParticipantList()
        }, err => {
          console.log(err);
          alert('Failed adding participant');
        });
    });
    // formlistener
    $('.sdk-wrapper').on('submit', 'form.add-participant-form', function(e){
      e.preventDefault();
      QiscusSDK.core
        .addParticipantsToGroup(QiscusSDK.core.selected.id, [$('#add-participant-txt').val()])
        .then(() => {
          alert('Successfully Adding Participant');
          $('#add-participant-txt').val('');
          renderParticipantList()
        }, err => {
          console.log(err);
          alert('Failed adding participant');
        });
    })
  }

  function renderSidebarHeader() {
    $('.app-sidebar__header img').attr('src', QiscusSDK.core.userData.avatar_url);
    $('.app-sidebar__myinfo div').html(QiscusSDK.core.userData.username);
    $('.app-sidebar__myinfo span').html('Online');
  }

  function attachClickListenerOnConversation() {
    $('.app-sidebar__lists').on('click', 'li', function () {
      var $this = $(this);
      $('.app-sidebar__lists li').removeClass('active');
      $this.addClass('active');
      toggleConversationActiveClass();
      // if($this.data('room-type') == 'single'){
      //   QiscusSDK.core.UI.chatTarget($this.data('room-name'));
      // } else {
      //   QiscusSDK.core.UI.chatGroup($this.data('id'));
      // }
      QiscusSDK.core.UI.chatGroup($this.data('id'));
      $('#empty-chat-wrapper').addClass('hidden');
      $('#room-info').hide('fast');
      var roomId = $this.attr('data-id');
      clearUnreadMessages(roomId);
    })
  }

  function toggleConversationActiveClass() {
    if (!QiscusSDK.core.selected) return;
    appSidebar.find('li').removeClass('active');
    appSidebar.find('li#room-' + QiscusSDK.core.selected.id).addClass('active');
  }

  function createRoomDOM(room) {
    var avatar = document.createElement('img');
    avatar.classList.add('room-avatar');
    avatar.setAttribute('src', room.avatar);
    avatar.setAttribute('width', '48');
    avatar.setAttribute('height', '48');
    var li = document.createElement('li');
    li.setAttribute('data-id', room.id);
    li.setAttribute('id', 'room-' + room.id);
    li.setAttribute('data-room-name', room.name);
    li.setAttribute('data-room-type', room.room_type);
    li.setAttribute('data-sdk-last-message-id', '-1');
    li.setAttribute('data-sdk-unread-count', '0');
    li.classList.add('room-item');
    var detail = document.createElement('div');
    var name = document.createElement('strong');
    name.innerText = room.name;
    var lastComment = document.createElement('span');
    lastComment.classList.add('last-comment');
    lastComment.innerText = room.last_comment_message;
    detail.appendChild(name);
    detail.appendChild(lastComment);
    var unreadCount = document.createElement('span');
    unreadCount.classList.add('unread-count');
    unreadCount.innerText = room.count_notif;
    if (room.count_notif <= 0) {
      unreadCount.classList.add('hidden');
    }
    li.appendChild(avatar);
    li.appendChild(detail);
    li.appendChild(unreadCount);
    return li;
  }

  var $contactList = $('ul.contact-list');
  $('input#search-contact')
      .on('keyup', _.debounce(function () {
        var value = this.value;
        $contactList.find('li')
            .toArray()
            .map(function (item) {
              if ($(item).hasClass('hidden')) {
                $(item).removeClass('hidden');
              }
              return item;
            })
            .filter(function (item) {
              var contactName = $(item).attr('data-user-name');
              return contactName.toLowerCase().indexOf(value) < 0;
            })
            .forEach(function (item) {
              $(item).addClass('hidden');
            });
      }, 100));

  $('#input-search-room')
      .on('focus', function () {
        $('.app-sidebar__search__icon').addClass('focus');
      })
      .on('blur', function () {
        $('.app-sidebar__search__icon').removeClass('focus');
      })
      .on('keyup', _.debounce(function () {
        var value = this.value;
        appSidebar.find('li')
            .toArray()
            .map(function (item) {
              if ($(item).hasClass('hidden')) {
                $(item).removeClass('hidden');
              }
              return item;
            })
            .filter(function (item) {
              var roomName = $(item).attr('data-room-name');
              return roomName.toLowerCase().indexOf(value) < 0;
            })
            .forEach(function (item) {
              $(item).addClass('hidden');
            })
      }, 100));

  $('#chat-with-stranger-btn').on('click', function (event) {
    event.preventDefault();
    $chatStrangerSidebar.removeClass('hidden');
  });
  $chatStrangerSidebar.on('click', '.navigation-btn', function (event) {
    event.preventDefault();
    $chatStrangerSidebar.addClass('hidden');
    $chatStrangerSidebar.find('input').val('');
  });
  $chatStrangerSidebar
      .find('form')
      .on('submit', function (event) {
        event.preventDefault();
        var target = event.target['uniqueId'].value;
        QiscusSDK.core.UI.chatTarget(target);
        return false;
      });
  $chatStrangerSidebar.on('keydown', 'input', function (event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      var value = event.target.value;
      QiscusSDK.core.UI.chatTarget(value);
    }
  });

  var $showContactListBtn = $('#show-contact-list');
  $showContactListBtn.on('click', function (event) {
    event.preventDefault();
    $contactListSidebar.removeClass('hidden');
    return false;
  });
  $contactListSidebar
      .find('#hide-contact-list-btn')
      .on('click', function (event) {
        event.preventDefault();
        $contactListSidebar.addClass('hidden');
        return false;
      });

  var $menuBtn = $('#menu-btn');
  var $popOver = $('.popover-menu');
  $popOver.on('click', 'a', function () {
    $popOver.addClass('hidden');
  });
  $menuBtn.on('click', function (event) {;
    event.preventDefault();
    $popOver.toggleClass('hidden');
    return false;
  });

  var $logoutBtn = $('#logout-btn');
  $logoutBtn.on('click', function (event) {
    event.preventDefault();
    window.sessionStorage.clear();
    window.location.reload();
    return false;
  });

  $contactListSidebar.on('click', '.contact-item', function (event) {
    var target = $(this).data('user-email');
    QiscusSDK.core.UI.chatTarget(target);
    $('#empty-chat-wrapper').addClass('hidden');
    $('#room-info').hide('fast');
  });

  // Load contact
  function loadContactList () {
    var url = window.SDK_DASHBOARD_URL + '/api/contacts?show_all=true';
    $.ajax({
      url: url,
      method: 'get'
    }).done(function (data) {
      var contacts = data.results.users
          .filter(function (user) {
            return user.email !== QiscusSDK.core.email;
          });
      var contactDOM = contacts.map(createContactDOM);
      $('ul.contact-list').empty().append(contactDOM);
      // we need to list this contact for adding participant autocomplete also
      const autocompleteData = [];
      contacts.forEach(contact => {
        autocompleteData.push({
          data: contact.username,
          value: contact.email
        });
      })
      $('#add-participant-txt').autocomplete({
        lookup: autocompleteData,
        onSelect: function (suggestion) {
          console.log('You selected: ' + suggestion.value + ', ' + suggestion.data);
        }
      });
    }).fail(function (error) {
      console.error('error when fetching contact list', error);
    })
  }

  function createContactDOM(contactData) {
    var container = document.createElement('li');
    var avatar = document.createElement('img');
    var detailContainer = document.createElement('div');
    var name = document.createElement('span');
    var onlineStatus = document.createElement('span');

    container.classList.add('contact-item');
    container.setAttribute('data-room-id', contactData.id);
    container.setAttribute('data-user-email', contactData.email);
    container.setAttribute('data-user-name', contactData.name);
    container.setAttribute('data-user-username', contactData.username);
    detailContainer.classList.add('contact-item-detail');
    avatar.setAttribute('src', contactData.avatar_url);
    name.classList.add('name');
    name.innerText = contactData.name;
    onlineStatus.classList.add('online-status');
    onlineStatus.innerText = 'online';

    detailContainer.appendChild(name);
    detailContainer.appendChild(onlineStatus);
    container.appendChild(avatar);
    container.appendChild(detailContainer);

    return container;
  }

  function createSelectedDataDOM (userData) {
    var $li = $(document.createElement('li'));
    var $removeButton = $(document.createElement('button'));
    var $removeButtonIcon = $(document.createElement('img'));
    var $avatar = $(document.createElement('img'));

    $li.addClass('selected-participant-item');
    $removeButton.addClass('remove-participant-button');
    $removeButtonIcon.addClass('remove-participant');
    $avatar.addClass('participant-avatar');

    $li.attr('data-user-email', userData.email);
    $li.attr('data-user-id', userData.id);
    $li.attr('data-user-name', userData.name);
    $removeButtonIcon.attr('src', '/assets/img/icon-remove-participant.svg');
    $avatar.attr('src', userData.avatar);

    $removeButton.append($removeButtonIcon);
    $li.append($removeButton);
    $li.append($avatar);
    return $li;
  }
  var $selectedParticipantList = $('.create-group .selected-participant-list');
  var $createGroupContactList = $('.create-group .contact-list');
  $createGroupContactList.on('click', '.contact-item', function (event) {
    var $this = $(this);
    $this.toggleClass('selected');
    var userId = $this.data('room-id');
    if ($this.hasClass('selected')) {
      var userData = {
        id: userId,
        name: $this.data('user-name'),
        email: $this.data('user-email'),
        avatar: $this.find('img').attr('src')
      };
      var $selectedUserDOM = createSelectedDataDOM(userData);
      $selectedParticipantList.append($selectedUserDOM);
    } else {
      // Remove from selected participant list
      $selectedParticipantList.find('li[data-user-id=' + userId + ']')
          .remove();
    }
    calculateSelectedParticipantChange();
    return false
  });
  $('#create-group-search-contact-input')
      .on('keyup', _.debounce(function () {
        var value = $(this).val();
        $createGroupContactList
            .find('li.contact-item')
            .toArray()
            .map(function (item) {
              if ($(item).hasClass('hidden')) $(item).removeClass('hidden');
              return item;
            })
            .filter(function (item) {
              var userName = $(item).attr('data-user-name');
              return userName.toLowerCase().indexOf(value) < 0;
            })
            .forEach(function (item) {
              $(item).addClass('hidden');
            })
      }, 100));
  var $createGroupNextBtn = $createGroupSidebar.find('.next-button');
  function calculateSelectedParticipantChange () {
    var hasChild = $selectedParticipantList.children().length > 0;
    if (hasChild) {
      $selectedParticipantList.parent().removeClass('hidden');
      $createGroupNextBtn.removeClass('hidden');
    } else {
      $selectedParticipantList.parent().addClass('hidden');
      $createGroupNextBtn.addClass('hidden');
    }
  }
  $createGroupNextBtn.on('click', function () {
    $createGroupNameSidebar.removeClass('hidden');
    $createGroupSidebar.addClass('hidden');
    return false;
  });
  $selectedParticipantList.on('click', '.remove-participant-button', function () {
    var $parent = $(this).parent();
    var userId = $parent.data('user-id');
    var $selectedItem = $createGroupSidebar.find('li.contact-item[data-room-id=' + userId + ']');
    $selectedItem.removeClass('selected');
    $parent.remove();
    calculateSelectedParticipantChange();
    return false;
  });
  var $groupNameInput = $createGroupNameSidebar.find('input.group-name-input');
  var $groupNameNextBtn = $createGroupNameSidebar.find('button.next-button');
  $groupNameInput.on('keyup', _.debounce(function (event) {
    var $this = $(this);
    var value = $this.val();
    if (value.length >= 5) {
      $groupNameNextBtn.removeClass('hidden');
    } else {
      $groupNameNextBtn.addClass('hidden');
    }
  }, 100));
  $groupNameNextBtn.on('click', function (event) {
    console.group('create group');
    var participants = $createGroupContactList.find('li.contact-item.selected')
        .toArray()
        .map(function (item) { return $(item).attr('data-user-email'); });
    var groupName = $groupNameInput.val();
    console.log('with name:', groupName);
    console.log('with participants:', participants);
    console.groupEnd();
    QiscusSDK.core.createGroupRoom(groupName, participants);
    return false;
  });
  var $createGroupBtn = $('#create-group-btn');
  $createGroupBtn.on('click', function () {
    $popOver.addClass('hidden');
    $createGroupSidebar.removeClass('hidden');
    $mainSidebar.addClass('hidden');
    return false;
  });
  $createGroupNameSidebar.find('.navigation-btn')
      .on('click', function () {
        $createGroupNameSidebar.addClass('hidden');
        $createGroupSidebar.removeClass('hidden');
        return false;
      });
  $createGroupSidebar.find('.navigation-btn')
      .on('click', function () {
        $createGroupSidebar.addClass('hidden');
        $mainSidebar.removeClass('hidden');
        return false;
      });
});
