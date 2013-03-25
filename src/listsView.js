/*
 * Copyright (c) 2013 Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 * Gnome To Do is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * Gnome To Do is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome To Do; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 */

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gd = imports.gi.Gd;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const _ = imports.gettext.gettext;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Config = imports.config;
const Global = imports.global;
const Selection = imports.selection;

const EmptyResultsBox = new Lang.Class({
    Name: 'EmptyResultsBox',
    Extends: Gtk.Grid,

    _init: function(noAccounts) {
        this.parent({
            orientation: Gtk.Orientation.HORIZONTAL,
            column_spacing: 12,
            expand: true,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER
        });

        this.get_style_context().add_class('dim-label');

        this._image = new Gtk.Image({ pixel_size: 64,
                                      icon_name: 'emblem-documents-symbolic' });
        this.add(this._image);

        this._labelsGrid = new Gtk.Grid({ orientation: Gtk.Orientation.VERTICAL,
                                          row_spacing: 12 });
        this.add(this._labelsGrid);

        let titleLabel = new Gtk.Label({ label: '<b><span size="large">' +
                                         _("No Task Lists Found") +
                                         '</span></b>',
                                         use_markup: true,
                                         halign: Gtk.Align.START,
                                         vexpand: true });
        this._labelsGrid.add(titleLabel);

        if (!noAccounts) {
            titleLabel.valign = Gtk.Align.CENTER;
        } else {
            titleLabel.valign = Gtk.Align.START;
            this._addSystemSettingsLabel();
        }

        this.show_all();
    },

    _addSystemSettingsLabel: function() {
        let detailsStr =
            // Translators: %s here is "System Settings", which is in a separate string
            // due to markup, and should be translated only in the context of this sentence
            _("You can add your online accounts in %s").format(
            " <a href=\"system-settings\">" +
            // Translators: this should be translated in the context of the
            // "You can add your online accounts in System Settings" sentence above
            _("System Settings") +
            "</a>");
        let details = new Gtk.Label({ label: detailsStr,
                                      use_markup: true,
                                      halign: Gtk.Align.START,
                                      xalign: 0,
                                      max_width_chars: 24,
                                      wrap: true });
        this._labelsGrid.add(details);

        details.connect('activate-link', Lang.bind(this,
            function(label, uri) {
                if (uri != 'system-settings')
                    return false;

                try {
                    let app = Gio.AppInfo.create_from_commandline(
                        'gnome-control-center online-accounts', null, 0);

                    let screen = this.get_screen();
                    let display = screen ? screen.get_display() : Gdk.Display.get_default();
                    let ctx = display.get_app_launch_context();

                    if (screen)
                        ctx.set_screen(screen);

                    app.launch([], ctx);
                } catch(e) {
                    log('Unable to launch gnome-control-center: ' + e.message);
                }

                return true;
            }));
    }
});

const ListsView = new Lang.Class({
    Name: 'ListsView',
    Extends: Gtk.Grid,

    _init: function(actionGroup) {
        this.parent({ orientation: Gtk.Orientation.VERTICAL });

        this._delayedShowId = 0;

        this.searchbar = new ListsSearchbar(actionGroup);
        this.add(this.searchbar);

        this._overlay = new Gtk.Overlay();
        this.add(this._overlay);

        this._stack = new Gd.Stack({ transition_type: Gd.StackTransitionType.CROSSFADE });
        this._overlay.add(this._stack);

        this._noResults = new EmptyResultsBox(false);
        this._stack.add(this._noResults);

        this._noAccounts = new EmptyResultsBox(true);
        this._stack.add(this._noAccounts);

        /* Add SpinnerBox */
        this._spinnerBox = new SpinnerBox();
        this._stack.add(this._spinnerBox);
        
        /* Add the MainView. */
        this.mainView = new Gd.MainView({ view_type: Gd.MainViewType.ICON, expand: true });
        this._stack.add(this.mainView);

        /* Add selectionToolbar. */
        this.selectionToolbar = new Selection.SelectionToolbar();
        this._overlay.add_overlay(this.selectionToolbar);

        /* Show everything but the overlays */
        this._stack.show_all();
        this._overlay.show();
        this.show();
    },

    showMainView: function(loading) {
        this._stack.set_visible_child(this.mainView);
    },
    
    showNoResults: function() {
        this._stack.set_visible_child(this._noResults);
    },

    showNoAccounts: function() {
        this._stack.set_visible_child(this._noAccounts);
    },

    showLoading: function() {
        this._showSpinnerBoxDelayed();
    },

    handleEvent: function(event) {
        this.searchbar.handleEvent(event);
    },

    _showSpinnerBoxDelayed: function(delay) {
        this._clearDelayId();

        this._delayedShowId = Mainloop.timeout_add(delay, Lang.bind(this, function() {
            this._delayedMoveId = 0;

            this._stack.set_visible_child(this._spinnerBox);
            return false;
        }));
    },

    _clearDelayId: function() {
        if (this._delayedShowId != 0) {
            Mainloop.source_remove(this._delayedShowId);
            this._delayedShowId = 0;
        }
    }
});

const SpinnerBox = Lang.Class({
    Name: 'SpinnerBox',
    Extends: Gtk.Bin,

    _init: function() {
        this.parent();

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/spinner_box.glade');

        this._grid = builder.get_object('grid');
        this.add(this._grid);

        this.show_all();
    }
});

const _SEARCH_ENTRY_TIMEOUT = 200;

const Searchbar = new Lang.Class({
    Name: 'Searchbar',
    Extends: Gd.Revealer,

    _init: function(actionGroup) {
        this.parent();

        this._actionGroup = actionGroup;

        this._searchEntryTimeout = 0;
        this._searchTypeId = 0;
        this._searchMatchId = 0;
        this.searchChangeBlocked = false;

        this._in = false;

        let toolbar = new Gtk.Toolbar();
        toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_PRIMARY_TOOLBAR);
        this.add(toolbar);

        // subclasses will create this._searchEntry and this._searchContainer
        // GtkWidgets
        this.createSearchWidgets();

        let item = new Gtk.ToolItem();
        item.set_expand(true);
        item.add(this._searchContainer);
        toolbar.insert(item, 0);

        this._searchEntry.connect('key-press-event', Lang.bind(this,
            function(widget, event) {
                let keyval = event.get_keyval()[1];

                if (keyval == Gdk.KEY_Escape) {
                    actionGroup.change_action_state('search', GLib.Variant.new('b', false));
                    return true;
                }

                return false;
            }));

        this._searchEntry.connect('changed', Lang.bind(this,
            function() {
                if (this._searchEntryTimeout != 0) {
                    Mainloop.source_remove(this._searchEntryTimeout);
                    this._searchEntryTimeout = 0;
                }

                if (this.searchChangeBlocked)
                    return;

                this._searchEntryTimeout = Mainloop.timeout_add(_SEARCH_ENTRY_TIMEOUT, Lang.bind(this,
                    function() {
                        this._searchEntryTimeout = 0;
                        this.entryChanged();
                    }));
            }));

        // connect to the search action state for visibility
        let searchStateId = actionGroup.connect('action-state-changed::search',
            Lang.bind(this, this._onActionStateChanged));
        
        this.show_all();
    },

    _onActionStateChanged: function(source, actionName, state) {
        if (state.get_boolean())
            this._show();
        else
            this._hide();
    },

    createSearchWidgets: function() {
        log('Error: Searchbar implementations must override createSearchWidgets');
    },

    entryChanged: function() {
        log('Error: Searchbar implementations must override entryChanged');
    },

    _isKeynavEvent: function(event) {
        let keyval = event.get_keyval()[1];
        let state = event.get_state()[1];

        if (keyval == Gdk.KEY_Tab ||
            keyval == Gdk.KEY_KP_Tab ||
            keyval == Gdk.KEY_Up ||
            keyval == Gdk.KEY_KP_Up ||
            keyval == Gdk.KEY_Up ||
            keyval == Gdk.KEY_Down ||
            keyval == Gdk.KEY_KP_Down ||
            keyval == Gdk.KEY_Left ||
            keyval == Gdk.KEY_KP_Left ||
            keyval == Gdk.KEY_Right ||
            keyval == Gdk.KEY_KP_Right ||
            keyval == Gdk.KEY_Home ||
            keyval == Gdk.KEY_KP_Home ||
            keyval == Gdk.KEY_End ||
            keyval == Gdk.KEY_KP_End ||
            keyval == Gdk.KEY_Page_Up ||
            keyval == Gdk.KEY_KP_Page_Up ||
            keyval == Gdk.KEY_Page_Down ||
            keyval == Gdk.KEY_KP_Page_Down ||
            (state & (Gdk.ModifierType.CONTROL_MASK | Gdk.ModifierType.MOD1_MASK) != 0))
            return true;

        return false;
    },

    _isSpaceEvent: function(event) {
        let keyval = event.get_keyval()[1];
        return (keyval == Gdk.KEY_space);
    },

    handleEvent: function(event) {
        if (this._in)
            return false;

        if (this._isKeynavEvent(event))
            return false;

        if (this._isSpaceEvent(event))
            return false;

        if (!this._searchEntry.get_realized())
            this._searchEntry.realize();

        let handled = false;

        let preeditChanged = false;
        let preeditChangedId =
            this._searchEntry.connect('preedit-changed', Lang.bind(this,
                function() {
                    preeditChanged = true;
                }));

        let oldText = this._searchEntry.get_text();
        let res = this._searchEntry.event(event);
        let newText = this._searchEntry.get_text();

        this._searchEntry.disconnect(preeditChangedId);

        if (((res && (newText != oldText)) || preeditChanged)) {
            handled = true;

            if (!this._in)
                this._actionGroup.change_action_state('search', GLib.Variant.new('b', true));
        }

        return handled;
    },

    _show: function() {
        let eventDevice = Gtk.get_current_event_device();
        this.set_reveal_child(true);
        this._in = true;

        if (eventDevice)
            Gd.entry_focus_hack(this._searchEntry, eventDevice);
    },

    _hide: function() {
        this._in = false;
        this.set_reveal_child(false);
        // clear all the search properties when hiding the entry
        this._searchEntry.set_text('');
    }
});

const ListsSearchbar = new Lang.Class({
    Name: 'ListsSearchbar',
    Extends: Searchbar,

    Properties: { 'searchString': GObject.ParamSpec.string('searchString',
        'SearchString', 'The current search string', GObject.ParamFlags.READABLE, '')
    },
    
    _init: function(actionGroup) {
        this.parent(actionGroup);

        this._searchString = '';
    },

    get searchString() {
        return this._searchString;
    },

    createSearchWidgets: function() {
        this._searchEntry = new Gtk.SearchEntry({ width_request: 500 });
        this._searchContainer = new Gtk.Box({ halign: Gtk.Align.CENTER });
        this._searchContainer.add(this._searchEntry);
    },

    entryChanged: function() {
        if (this._searchEntry.text !== this._searchString) {
            this._searchString = this._searchEntry.text;
            this.notify('searchString');
        }
    }
});
