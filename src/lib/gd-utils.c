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

#include "gd-utils.h"

#include <libgd/gd.h>

#include <string.h>
#include <math.h>



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
    
      
static char *
gd_filename_get_extension_offset (const char *filename)
{
	char *end, *end2;

	end = strrchr (filename, '.');

	if (end && end != filename) {
		if (strcmp (end, ".gz") == 0 ||
		    strcmp (end, ".bz2") == 0 ||
		    strcmp (end, ".sit") == 0 ||
		    strcmp (end, ".Z") == 0) {
			end2 = end - 1;
			while (end2 > filename &&
			       *end2 != '.') {
				end2--;
			}
			if (end2 != filename) {
				end = end2;
			}
		}
	}

	return end;
}

/**
 * gd_filename_strip_extension:
 * @filename_with_extension:
 *
 * Returns: (transfer full):
 */
char *
gd_filename_strip_extension (const char * filename_with_extension)
{
	char *filename, *end;

	if (filename_with_extension == NULL) {
		return NULL;
	}

	filename = g_strdup (filename_with_extension);
	end = gd_filename_get_extension_offset (filename);

	if (end && end != filename) {
		*end = '\0';
	}

	return filename;
}

/**
 * gd_time_val_from_iso8601:
 * @string: (allow-none):
 * @timeval: (out):
 *
 * Returns:
 */
gboolean
gd_time_val_from_iso8601 (const gchar *string,
                          GTimeVal *timeval)
{
  if (string == NULL)
    g_get_current_time (timeval);

  return g_time_val_from_iso8601 (string, timeval);
}

/**
 * gd_iso8601_from_timestamp:
 * @timestamp:
 *
 * Returns: (transfer full):
 */
gchar *
gd_iso8601_from_timestamp (gint64 timestamp)
{
  GTimeVal tv;

  tv.tv_sec = timestamp;
  tv.tv_usec = 0;
  return g_time_val_to_iso8601 (&tv);
}

/**
 * gd_create_collection_icon:
 * @base_size:
 * @pixbufs: (element-type GdkPixbuf):
 *
 * Returns: (transfer full):
 */
GIcon *
gd_create_collection_icon (gint base_size,
                           GList *pixbufs)
{
  cairo_surface_t *surface;
  GIcon *retval;
  cairo_t *cr;
  GtkStyleContext *context;
  GtkWidgetPath *path;
  gint padding, tile_size, scale_size;
  gint pix_width, pix_height;
  gint idx, cur_x, cur_y;
  GList *l;
  GdkPixbuf *pix;

  /* TODO: do not hardcode 4, but scale to another layout if more
   * pixbufs are provided.
   */

  padding = MAX (floor (base_size / 10), 4);
  tile_size = (base_size - (3 * padding)) / 2;

  context = gtk_style_context_new ();
  gtk_style_context_add_class (context, "documents-collection-icon");

  path = gtk_widget_path_new ();
  gtk_widget_path_append_type (path, GTK_TYPE_ICON_VIEW);
  gtk_style_context_set_path (context, path);
  gtk_widget_path_unref (path);

  surface = cairo_image_surface_create (CAIRO_FORMAT_ARGB32, base_size, base_size);
  cr = cairo_create (surface);

  gtk_render_background (context, cr,
                         0, 0, base_size, base_size);

  l = pixbufs;
  idx = 0;
  cur_x = padding;
  cur_y = padding;

  while (l != NULL && idx < 4)
    {
      pix = l->data;
      pix_width = gdk_pixbuf_get_width (pix);
      pix_height = gdk_pixbuf_get_height (pix);

      scale_size = MIN (pix_width, pix_height);

      cairo_save (cr);

      cairo_translate (cr, cur_x, cur_y);

      cairo_rectangle (cr, 0, 0,
                       tile_size, tile_size);
      cairo_clip (cr);

      cairo_scale (cr, (gdouble) tile_size / (gdouble) scale_size, (gdouble) tile_size / (gdouble) scale_size);
      gdk_cairo_set_source_pixbuf (cr, pix, 0, 0);

      cairo_paint (cr);
      cairo_restore (cr);

      if ((idx % 2) == 0)
        {
          cur_x += tile_size + padding;
        }
      else
        {
          cur_x = padding;
          cur_y += tile_size + padding;
        }

      idx++;
      l = l->next;
    }

  retval = G_ICON (gdk_pixbuf_get_from_surface (surface, 0, 0, base_size, base_size));

  cairo_surface_destroy (surface);
  cairo_destroy (cr);
  g_object_unref (context);

  return retval;
}

#define _BG_MIN_SIZE 20
#define _EMBLEM_MIN_SIZE 8

/**
 * gd_create_symbolic_icon:
 * @name:
 *
 * Returns: (transfer full):
 */
GIcon *
gd_create_symbolic_icon (const gchar *name,
                         gint base_size)
{
  gchar *symbolic_name;
  GIcon *icon, *retval = NULL;
  cairo_surface_t *surface;
  cairo_t *cr;
  GtkStyleContext *style;
  GtkWidgetPath *path;
  GdkPixbuf *pixbuf;
  GtkIconTheme *theme;
  GtkIconInfo *info;
  gint bg_size;
  gint emblem_size;
  gint total_size;

  total_size = base_size / 2;
  bg_size = MAX (total_size / 2, _BG_MIN_SIZE);
  emblem_size = MAX (bg_size - 8, _EMBLEM_MIN_SIZE);

  surface = cairo_image_surface_create (CAIRO_FORMAT_ARGB32, total_size, total_size);
  cr = cairo_create (surface);

  style = gtk_style_context_new ();

  path = gtk_widget_path_new ();
  gtk_widget_path_append_type (path, GTK_TYPE_ICON_VIEW);
  gtk_style_context_set_path (style, path);
  gtk_widget_path_unref (path);

  gtk_style_context_add_class (style, "documents-icon-bg");

  gtk_render_background (style, cr, (total_size - bg_size) / 2, (total_size - bg_size) / 2, bg_size, bg_size);

  symbolic_name = g_strconcat (name, "-symbolic", NULL);
  icon = g_themed_icon_new_with_default_fallbacks (symbolic_name);
  g_free (symbolic_name);

  theme = gtk_icon_theme_get_default();
  info = gtk_icon_theme_lookup_by_gicon (theme, icon, emblem_size,
                                         GTK_ICON_LOOKUP_FORCE_SIZE);
  g_object_unref (icon);

  if (info == NULL)
    goto out;

  pixbuf = gtk_icon_info_load_symbolic_for_context (info, style, NULL, NULL);
  gtk_icon_info_free (info);

  if (pixbuf == NULL)
    goto out;

  gtk_render_icon (style, cr, pixbuf, (total_size - emblem_size) / 2,  (total_size - emblem_size) / 2);
  g_object_unref (pixbuf);

  retval = G_ICON (gdk_pixbuf_get_from_surface (surface, 0, 0, total_size, total_size));

 out:
  g_object_unref (style);
  cairo_surface_destroy (surface);
  cairo_destroy (cr);

  return retval;
}

/* taken from gtk/gtktreeview.c */
static void
send_focus_change (GtkWidget *widget,
                   GdkDevice *device,
		   gboolean   in)
{
  GdkDeviceManager *device_manager;
  GList *devices, *d;

  device_manager = gdk_display_get_device_manager (gtk_widget_get_display (widget));
  devices = gdk_device_manager_list_devices (device_manager, GDK_DEVICE_TYPE_MASTER);
  devices = g_list_concat (devices, gdk_device_manager_list_devices (device_manager, GDK_DEVICE_TYPE_SLAVE));
  devices = g_list_concat (devices, gdk_device_manager_list_devices (device_manager, GDK_DEVICE_TYPE_FLOATING));

  for (d = devices; d; d = d->next)
    {
      GdkDevice *dev = d->data;
      GdkEvent *fevent;
      GdkWindow *window;

      if (gdk_device_get_source (dev) != GDK_SOURCE_KEYBOARD)
        continue;

      window = gtk_widget_get_window (widget);

      /* Skip non-master keyboards that haven't
       * selected for events from this window
       */
      if (gdk_device_get_device_type (dev) != GDK_DEVICE_TYPE_MASTER &&
          !gdk_window_get_device_events (window, dev))
        continue;

      fevent = gdk_event_new (GDK_FOCUS_CHANGE);

      fevent->focus_change.type = GDK_FOCUS_CHANGE;
      fevent->focus_change.window = g_object_ref (window);
      fevent->focus_change.in = in;
      gdk_event_set_device (fevent, device);

      gtk_widget_send_focus_change (widget, fevent);

      gdk_event_free (fevent);
    }

  g_list_free (devices);
}

void
gd_entry_focus_hack (GtkWidget *entry,
                     GdkDevice *device)
{
  GtkEntryClass *entry_class;
  GtkWidgetClass *entry_parent_class;

  /* Grab focus will select all the text.  We don't want that to happen, so we
   * call the parent instance and bypass the selection change.  This is probably
   * really non-kosher. */
  entry_class = g_type_class_peek (GTK_TYPE_ENTRY);
  entry_parent_class = g_type_class_peek_parent (entry_class);
  (entry_parent_class->grab_focus) (entry);

  /* send focus-in event */
  send_focus_change (entry, device, TRUE);
}

/**
 * gd_create_variant_from_pixbuf:
 * @pixbuf:
 *
 * Returns: (transfer full):
 */
GVariant *
gd_create_variant_from_pixbuf (GdkPixbuf *pixbuf)
{
  GVariant *variant;
  guchar *data;
  guint   length;

  data = gdk_pixbuf_get_pixels_with_length (pixbuf, &length);
  variant = g_variant_new ("(iiibii@ay)",
                           gdk_pixbuf_get_width (pixbuf),
                           gdk_pixbuf_get_height (pixbuf),
                           gdk_pixbuf_get_rowstride (pixbuf),
                           gdk_pixbuf_get_has_alpha (pixbuf),
                           gdk_pixbuf_get_bits_per_sample (pixbuf),
                           gdk_pixbuf_get_n_channels (pixbuf),
                           g_variant_new_from_data (G_VARIANT_TYPE_BYTESTRING,
                                                    data, length, TRUE,
                                                    (GDestroyNotify)g_object_unref,
                                                    g_object_ref (pixbuf)));
  return g_variant_ref_sink (variant);
}

/**
 * gd_format_int_alternative_output:
 * @intval:
 *
 * Returns: (transfer full):
 */
gchar *
gd_format_int_alternative_output (gint intval)
{
  return g_strdup_printf ("%Id", intval);
}

static const gint PIXBUF_HEIGHT = 180;
static const gint PIXBUF_WIDTH = 140;

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
    gint content_width, content_height;
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

    content_width = PIXBUF_WIDTH + padding.left + padding.right;
    content_height = PIXBUF_HEIGHT + padding.top + padding.bottom;

    surface = cairo_image_surface_create (CAIRO_FORMAT_ARGB32, width, height);
    cr = cairo_create (surface);

    gtk_render_background (context, cr, border.left, border.top,
        content_width, content_height);

    cairo_save (cr);
    cairo_translate (cr, border.left + padding.left, border.top + padding.top);
    gd_draw_task_items (context, cr, items);
    cairo_restore (cr);

    return gdk_pixbuf_get_from_surface (surface, 0, 0, width, height);
}