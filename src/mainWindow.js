/*
 * Copyright (c) 2011 Red Hat, Inc.
 *
 * Gnome Documents is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * Gnome Documents is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome Documents; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Cosimo Cecchi <cosimoc@redhat.com>
 *
 */

const Clutter = imports.gi.Clutter;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const GtkClutter = imports.gi.GtkClutter;
const Gd = imports.gi.Gd;

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const ContentView = imports.contentView;
const Config = imports.config;
const Global = imports.global;
const MainToolbar = imports.mainToolbar;
const WindowMode = imports.windowMode;
const Utils = imports.utils;

const _ = imports.gettext.gettext;

const _CONFIGURE_ID_TIMEOUT = 100; // msecs

const MainWindow = Lang.Class({
    Name: 'MainWindow',
    Extends: Gtk.ApplicationWindow,

    _init: function(app) {
        this.parent({
            application: app,
            window_position: Gtk.WindowPosition.CENTER,
            hide_titlebar_when_maximized: true,
            title: _('To Do')
        });

        this._configureId = 0;

        this._clutterEmbed = new GtkClutter.Embed();
        this.add(this._clutterEmbed);
        this._clutterEmbed.show();

        let stage = this._clutterEmbed.get_stage();

        // apply the last saved window size and position
        let size = Global.settings.get_value('window-size');
        if (size.n_children() == 2) {
            let width = size.get_child_value(0);
            let height = size.get_child_value(1);

            this.set_default_size(width.get_int32(),
                                  height.get_int32());
        }

        let position = Global.settings.get_value('window-position');
        if (position.n_children() == 2) {
            let x = position.get_child_value(0);
            let y = position.get_child_value(1);

            this.move(x.get_int32(),
                             y.get_int32());
        }

        if (Global.settings.get_boolean('window-maximized'))
            this.maximize();

        this.connect('delete-event',
                            Lang.bind(this, this._quit));
        this.connect('key-press-event',
                            Lang.bind(this, this._onKeyPressEvent));
        this.connect('map-event',
                            Lang.bind(this, this._onMapEvent));
        this.connect('configure-event',
                            Lang.bind(this, this._onConfigureEvent));
        this.connect('window-state-event',
                            Lang.bind(this, this._onWindowStateEvent));

        Global.modeController.connect('fullscreen-changed',
                                      Lang.bind(this, this._onFullscreenChanged));

        // the base layout is a vertical ClutterBox
        this._layout = new Clutter.BoxLayout({ vertical: true });
        this._box = new Clutter.Box({ layout_manager: this._layout });
        this._box.add_constraint(
            new Clutter.BindConstraint({ coordinate: Clutter.BindCoordinate.SIZE,
                                         source: stage }));

        this.toolbar = new MainToolbar.MainToolbar();
        let toolbarActor = new GtkClutter.Actor({ 'contents': this.toolbar });
        this._box.add_child(toolbarActor);
        this._layout.set_fill(toolbarActor, true, false);

        this.contentView = new ContentView.ContentView();
        this._box.add_child(this.contentView);
        this._layout.set_expand(this.contentView, true);
        this._layout.set_fill(this.contentView, true, true);

        stage.add_actor(this._box);
    },

    _onMapEvent: function(widget, event) {
        /* Add our custom css */
        Gtk.StyleContext.add_provider_for_screen(this.get_screen(),
            Gd.load_css_provider_from_resource('/org/gnome/todo/gnome-todo.css'),
            Gtk.StyleProvider.PRIORITY_APPLICATION);
    },

    _saveWindowGeometry: function() {
        let window = this.get_window();
        let state = window.get_state();

        if (state & Gdk.WindowState.MAXIMIZED)
            return;

        // GLib.Variant.new() can handle arrays just fine
        let size = this.get_size();
        let variant = GLib.Variant.new ('ai', size);
        Global.settings.set_value('window-size', variant);

        let position = this.get_position();
        variant = GLib.Variant.new ('ai', position);
        Global.settings.set_value('window-position', variant);
    },

    _onConfigureEvent: function(widget, event) {
        if (Global.modeController.getFullscreen())
            return;

        if (this._configureId != 0) {
            Mainloop.source_remove(this._configureId);
            this._configureId = 0;
        }

        this._configureId = Mainloop.timeout_add(_CONFIGURE_ID_TIMEOUT, Lang.bind(this,
            function() {
                this._saveWindowGeometry();
                return false;
            }));
    },

    _onWindowStateEvent: function(widget, event) {
        let window = widget.get_window();
        let state = window.get_state();

        if (state & Gdk.WindowState.FULLSCREEN)
            return;

        let maximized = (state & Gdk.WindowState.MAXIMIZED);
        Global.settings.set_boolean('window-maximized', maximized);
    },

    _onFullscreenChanged: function(controller, fullscreen) {
        if (fullscreen)
            this.fullscreen();
        else
            this.unfullscreen();
    },

    _onKeyPressEvent: function(widget, event) {
        let keyval = event.get_keyval()[1];
        let state = event.get_state()[1];

        if ((keyval == Gdk.KEY_q) &&
            ((state & Gdk.ModifierType.CONTROL_MASK) != 0)) {
            this.destroy();
            return true;
        }

        return this._handleKeyOverview(event);
    },

    _handleKeyOverview: function(event) {
        let keyval = event.get_keyval()[1];

        // TODO: handle keys

        return false;
    },

    _quit: function() {
        // remove configure event handler if still there
        if (this._configureId != 0) {
            Mainloop.source_remove(this._configureId);
            this._configureId = 0;
        }

        // always save geometry before quitting
        this._saveWindowGeometry();

        return false;
    },

    showAbout: function() {
        let aboutDialog = new Gtk.AboutDialog();

        aboutDialog.artists = [ 'Jakub Steiner <jimmac@gmail.com>' ];
        aboutDialog.authors = [ 'Cosimo Cecchi <cosimoc@gnome.org>',
                                'Carl-Anton Ingmarsson <carlantoni@gnome.org>' ];
        aboutDialog.translator_credits = _("translator-credits");
        aboutDialog.program_name = _("GNOME To Do");
        aboutDialog.comments = _("A to do list application");
        aboutDialog.copyright = 'Copyright ' + String.fromCharCode(0x00A9) + ' 2011' + String.fromCharCode(0x2013) + '2012 Red Hat, Inc.';
        aboutDialog.license_type = Gtk.License.GPL_2_0;
        aboutDialog.logo_icon_name = 'gnome-todo';
        aboutDialog.version = Config.PACKAGE_VERSION;
        aboutDialog.website = 'http://live.gnome.org/GnomeTodo';
        aboutDialog.wrap_license = true;

        aboutDialog.modal = true;
        aboutDialog.transient_for = this;

        aboutDialog.show();
        aboutDialog.connect('response', function() {
            aboutDialog.destroy();
        });
    }
});
