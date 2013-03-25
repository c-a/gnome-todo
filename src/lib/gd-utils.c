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

#include "gd-utils.h"

#include <libgd/gd.h>

#include <string.h>



/**
 * gd_load_css_provider_from_resource:
 * 
 * Returns: (transfer full):
 */
GtkCssProvider *
gd_load_css_provider_from_resource (const char *path, GError **error)
{
  GBytes *bytes;
  GtkCssProvider *provider;

  bytes = g_resources_lookup_data (path, 0, error);
  if (!bytes)
    return NULL;

  provider = gtk_css_provider_new ();
  if (!gtk_css_provider_load_from_data (provider,
                                        g_bytes_get_data (bytes, NULL),
                                        g_bytes_get_size (bytes),
                                        error))
    g_clear_object (&provider);

  g_bytes_unref (bytes);
  return provider;
}

static const gint PIXBUF_HEIGHT = 160;
static const gint PIXBUF_WIDTH = 120;

static void
gd_draw_task_items (GtkStyleContext* context, cairo_t* cr, GPtrArray* items)
{
    PangoContext* pango_context;
    gint i;
    GString* string;
    char* text;
    PangoLayout* layout;

    pango_context = gdk_pango_context_get_for_screen (gdk_screen_get_default ());

    string = g_string_new (NULL);
    for (i = 0; i < items->len; i++)
    {
        const char* item = g_ptr_array_index (items, i);
        if (i != 0)
            g_string_append (string, "\n");

        g_string_append (string, item);
    }
    text = g_string_free (string, FALSE);

    layout = pango_layout_new (pango_context);
    pango_layout_set_text (layout, text, -1);
    pango_layout_set_width (layout, PANGO_SCALE * PIXBUF_WIDTH);
    pango_layout_set_height (layout, PANGO_SCALE * PIXBUF_HEIGHT);

    gtk_render_layout (context, cr, 0, 0, layout);

    g_object_unref (pango_context);
    g_object_unref (layout);
    g_free (text);
}

/**
 * gd_draw_task_list:
 * @items: (element-type utf8) (transfer none)
 *
 * Returns: (transfer full);
 */
GdkPixbuf*
gd_draw_task_list (GPtrArray* items)
{
    GtkCssProvider* provider;
    GError* err = NULL;
    GtkStyleContext* context;
    GtkWidgetPath* path;

    GtkBorder border, padding;
    gint width, height;
    cairo_surface_t* surface;
    cairo_t* cr;


    provider = gd_load_css_provider_from_resource ("/org/gnome/todo/gnome-todo.css", &err);
    if (!provider)
    {
        g_error("Failed to load style resource (%s)", err->message);
        g_error_free (err);
        return NULL;
    }

    context = gtk_style_context_new ();
    path = gtk_widget_path_new ();
    gtk_widget_path_append_type (path, GD_TYPE_MAIN_ICON_VIEW);
    gtk_style_context_set_path (context, path);
    gtk_widget_path_unref (path);

    gtk_style_context_add_provider (context, GTK_STYLE_PROVIDER (provider),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
    g_object_unref (provider);
    gtk_style_context_add_class (context, "todo-task-list-renderer");

    gtk_style_context_get_border (context, GTK_STATE_FLAG_NORMAL, &border);
    gtk_style_context_get_padding (context, GTK_STATE_FLAG_NORMAL, &padding);

    width = PIXBUF_WIDTH + border.left + border.right  + padding.left + padding.right;
    height = PIXBUF_HEIGHT + border.top + border.bottom + padding.top + padding.bottom;

    surface = cairo_image_surface_create (CAIRO_FORMAT_ARGB32, width, height);
    cr = cairo_create (surface);

    gtk_render_background (context, cr, 0, 0, width, height);

    cairo_save (cr);
    cairo_translate (cr, border.left + padding.left, border.top + padding.top);
    gd_draw_task_items (context, cr, items);
    cairo_restore (cr);

    gtk_render_frame (context, cr, 0, 0, width, height);

    return gdk_pixbuf_get_from_surface (surface, 0, 0, width, height);
}

/**
 * gd_date_time_to_iso8601:
 * @datetime:
 *
 * Returns: (transfer full): A string representation of @datetime in ISO8601
 * or %NULL on error.
 */
char*
gd_date_time_to_iso8601(GDateTime* datetime)
{
    GTimeVal tv;

    if (!g_date_time_to_timeval (datetime, &tv))
        return NULL;

    return g_time_val_to_iso8601(&tv);
}

/**
 * gd_date_time_equal:
 * @dt1: (allow-none):
 * @dt2: (allow-none):
 *
 * Returns: %TRUE if @dt1 and @dt2 are equal, %FALSE otherwise.
 */
gboolean
gd_date_time_equal(GDateTime* dt1, GDateTime* dt2)
{
    if (dt1 && dt2)
        return g_date_time_equal (dt1, dt2);

    if (!dt1 && !dt2)
        return TRUE;

    return FALSE;
}
