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

        this._stack = new Gtk.Stack({ transition_type: Gtk.StackTransitionType.CROSSFADE });
        this._overlay.add(this._stack);

        this._noResults = new EmptyResultsBox(false);
        this._stack.add(this._noResults);

        this._noAccounts = new EmptyResultsBox(true);
        this._stack.add(this._noAccounts);

        /* Add SpinnerBox */
        this._spinnerBox = new SpinnerBox();
        this._stack.add(this._spinnerBox);

        this._viewStack = new Gtk.Stack({ transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT });
        this._stack.add(this._viewStack);

        /* Add the Lists MainView. */
        this.mainView = new Gd.MainView({ view_type: Gd.MainViewType.ICON, expand: true });
        this.mainView.connect('selection-mode-request', Lang.bind(this, function() {
            actionGroup.change_action_state('lists.selection', GLib.Variant.new('b', true));
        }));
        this._viewStack.add_titled(this.mainView, 'lists', _('Lists'));

        /* Add selectionToolbar. */
        this.selectionToolbar = new Selection.SelectionToolbar();
        this._overlay.add_overlay(this.selectionToolbar);

        /* Show everything but the overlays */
        this._stack.show_all();
        this._overlay.show();
        this.show();
    },

    get viewStack() {
        return this._viewStack;
    },

    showMainView: function(loading) {
        this._stack.set_visible_child(this._viewStack);
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
        this.searchbar.handle_event(event);
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

const ListsSearchbar = new Lang.Class({
    Name: 'ListsSearchbar',
    Extends: Gtk.SearchBar,

    Properties: { 'searchString': GObject.ParamSpec.string('searchString',
        'SearchString', 'The current search string', GObject.ParamFlags.READABLE, '')
    },
    
    _init: function(actionGroup) {
        this.parent();

        this._actionGroup = actionGroup;
        this._searchString = '';

        // connect to the search action state for visibility
        let searchStateId = actionGroup.connect('action-state-changed::lists.search',
            Lang.bind(this, this._onActionStateChanged));

        this._searchEntry = new Gtk.SearchEntry({ width_request: 500 });
        this._searchEntry.connect('changed', Lang.bind(this, this._entryChanged));
        this.add(this._searchEntry);
        this.connect_entry(this._searchEntry);

        this.connect('notify::search-mode-enabled',
                     Lang.bind(this, this._searchModeEnabled));

        this.show_all();
    },

    get searchString() {
        return this._searchString;
    },

    _onActionStateChanged: function(source, actionName, state) {
        this.search_mode_enabled = state.get_boolean();
    },

    _entryChanged: function() {
        if (this._searchEntry.text !== this._searchString) {
            this._searchString = this._searchEntry.text;
            this.notify('searchString');
        }
    },

    _searchModeEnabled: function() {
        this._actionGroup.change_action_state('lists.search',
            GLib.Variant.new('b', this.search_mode_enabled));
    }
});
