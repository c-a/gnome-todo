/*
 * gnome-todo
 * Copyright (C) Carl-Anton 2012 <carlantoni@gnome.org>
 *
 * gnome-todo is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * gnome-todo is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.";
 */

#include <rest/oauth2-proxy.h>
#include <string.h>

#include "gd-gtasks-service.h"

struct _GdGTasksServiceParameter {
    char *name;
    char *value;

    int ref_count;
};

static void
gd_gtasks_service_parameter_ref (GdGTasksServiceParameter *parm)
{
    parm->ref_count++;
}

static void
gd_gtasks_service_parameter_unref (GdGTasksServiceParameter *parm)
{
    if (--parm->ref_count == 0)
    {
        g_free (parm->name);
        g_free (parm->value);

        g_slice_free (GdGTasksServiceParameter, parm);
    }
}

G_DEFINE_BOXED_TYPE (GdGTasksServiceParameter, gd_gtasks_service_parameter,
    (GBoxedCopyFunc)gd_gtasks_service_parameter_ref,
    (GBoxedFreeFunc)gd_gtasks_service_parameter_unref);

#define GD_TYPE_GTASKS_SERVICE_PROXY_CALL            (gd_gtasks_service_proxy_call_get_type ())
#define GD_GTASKS_SERVICE_PROXY_CALL(obj)            (G_TYPE_CHECK_INSTANCE_CAST ((obj), GD_TYPE_GTASKS_SERVICE_PROXY_CALL, GdGTasksServiceProxyCall))
#define GD_GTASKS_SERVICE_PROXY_CALL_CLASS(klass)    (G_TYPE_CHECK_CLASS_CAST ((klass), GD_TYPE_GTASKS_SERVICE_PROXY_CALL, GdGTasksServiceProxyCallClass))
#define GD_IS_GTASKS_SERVICE_PROXY_CALL(obj)         (G_TYPE_CHECK_INSTANCE_TYPE ((obj), GD_TYPE_GTASKS_SERVICE_PROXY_CALL))
#define GD_IS_GTASKS_SERVICE_PROXY_CALL_CLASS(klass) (G_TYPE_CHECK_CLASS_TYPE ((klass), GD_TYPE_GTASKS_SERVICE_PROXY_CALL))
#define GD_GTASKS_SERVICE_PROXY_CALL_GET_CLASS(obj)  (G_TYPE_INSTANCE_GET_CLASS ((obj), GD_TYPE_GTASKS_SERVICE_PROXY_CALL, GdGTasksServiceProxyCallClass))

typedef struct {
    RestProxyCall parent;

    char* content;
} GdGTasksServiceProxyCall;

typedef struct {
    RestProxyCallClass parent_class;
} GdGTasksServiceProxyCallClass;

GType gd_gtasks_service_proxy_call_get_type (void);

G_DEFINE_TYPE (GdGTasksServiceProxyCall, gd_gtasks_service_proxy_call, REST_TYPE_PROXY_CALL)

static RestProxyCall*
gd_gtasks_service_proxy_call_new (RestProxy *proxy)
{
    return g_object_new (GD_TYPE_GTASKS_SERVICE_PROXY_CALL, "proxy", proxy, NULL);
}

static void
gd_gtasks_service_proxy_call_set_content (GdGTasksServiceProxyCall *call, const gchar* content)
{
    g_return_if_fail (GD_IS_GTASKS_SERVICE_PROXY_CALL (call));

    if (call->content)
        g_free (call->content);

    call->content = g_strdup (content);
}

static gboolean
gd_gtasks_service_proxy_call_serialize (RestProxyCall *self,
    gchar **content_type,
    gchar **content, gsize *content_len,
    GError **error)
{
    GdGTasksServiceProxyCall *call = GD_GTASKS_SERVICE_PROXY_CALL (self);

    *content_type = g_strdup ("application/json");
    *content = call->content;
    if (*content)
        *content_len = strlen (*content);
    else
        *content_len = 0;

    return TRUE;
}

static void
gd_gtasks_service_proxy_call_class_init (GdGTasksServiceProxyCallClass *klass)
{
    RestProxyCallClass *parent_klass = (RestProxyCallClass*) klass;

    parent_klass->serialize_params = gd_gtasks_service_proxy_call_serialize;
}

static void
gd_gtasks_service_proxy_call_init (GdGTasksServiceProxyCall *self)
{
}

/**
 * gd_gtasks_service_parameter_new:
 * @name:
 * @value:
 *
 * Returns: A new #GdGTasksServiceParameter.
 */
GdGTasksServiceParameter *
gd_gtasks_service_parameter_new (const char *name, const char *value)
{
    GdGTasksServiceParameter *parm = g_slice_new0 (GdGTasksServiceParameter);

    parm->name = g_strdup (name);
    parm->value = g_strdup (value);

    return parm;
}


#define GTASKS_URL "https://www.googleapis.com/tasks/v1/"

enum {
    PROP_0,
    PROP_CLIENT_ID,
    PROP_CLIENT_SECRET,
    PROP_ACCESS_TOKEN
};

struct _GdGTasksServicePrivate {
    /* Properties */
    char *client_id;
    char *client_secret;

    RestProxy *proxy;
};


G_DEFINE_TYPE (GdGTasksService, gd_gtasks_service, G_TYPE_OBJECT);


static void
invoke_async_cb (GObject *source_object,
                 GAsyncResult *result,
                 gpointer user_data)
{
    RestProxyCall *call = REST_PROXY_CALL (source_object);
    GSimpleAsyncResult *simple = user_data;

    GError *err = NULL;
    GBytes *body;

    if (!rest_proxy_call_invoke_finish (call, result, &err))
    {
        g_simple_async_result_take_error (simple, err);
        goto done;
    }

    if (!(rest_proxy_call_get_status_code (call) >= 200 &&
          rest_proxy_call_get_status_code (call) < 300))
    {
        gint error_code;


        if (rest_proxy_call_get_status_code (call) == 401)
            error_code = G_IO_ERROR_PERMISSION_DENIED;
        else
            error_code = G_IO_ERROR_FAILED;

        g_simple_async_result_set_error (simple, G_IO_ERROR, error_code,
            "%s", rest_proxy_call_get_status_message (call));
        goto done;
    }

    body = g_bytes_new (rest_proxy_call_get_payload (call),
        rest_proxy_call_get_payload_length (call));
    g_simple_async_result_set_op_res_gpointer (simple, body, (GDestroyNotify)g_bytes_unref);

done:
    g_simple_async_result_complete (simple);
    g_object_unref (simple);
    g_object_unref (call);
}

/**
 * gd_gtasks_service_call_function:
 * @method:
 * @function:
 * @content: (allow-none)
 * @cancellable: (allow-none)
 * @callback: (scope async)
 * @user_data: (closure)
 */
void
gd_gtasks_service_call_function (GdGTasksService *service,
                        const char *method,
                        const char *function,
                        const gchar* content,
                        GCancellable *cancellable,
                        GAsyncReadyCallback callback,
                        gpointer user_data)
{
    GSimpleAsyncResult *simple;
    RestProxyCall *call;
    int i;
    char *access_token, *authorization;

    simple = g_simple_async_result_new (G_OBJECT (service), callback, user_data,
        gd_gtasks_service_call_function);

    call = gd_gtasks_service_proxy_call_new (service->priv->proxy);

    rest_proxy_call_set_method (call, method);
    rest_proxy_call_set_function (call, function);
    gd_gtasks_service_proxy_call_set_content (GD_GTASKS_SERVICE_PROXY_CALL (call),
        content);

    g_object_get (service->priv->proxy, "access-token", &access_token, NULL);
    authorization = g_strdup_printf ("Bearer %s", access_token);
    rest_proxy_call_add_header (call, "Authorization", authorization);
    g_free (access_token);
    g_free (authorization);

    rest_proxy_call_invoke_async (call, cancellable, invoke_async_cb, simple);
}

/**
 * gd_gtasks_service_call_function_finish:
 * @service: a #GdGTasksService
 * @result: the result from the #GAsyncReadyCallback
 * @error: a #GError, or %NULL
 *
 * Returns: (transfer full): The body of the response or %NULL.
 */
GBytes*
gd_gtasks_service_call_function_finish (GdGTasksService *service,
                                        GAsyncResult *result,
                                        GError **error)
{
    GSimpleAsyncResult *simple;

    g_return_val_if_fail (g_simple_async_result_is_valid (result,
        G_OBJECT (service),
        gd_gtasks_service_call_function),
        NULL);

    simple = (GSimpleAsyncResult *)result;

    if (g_simple_async_result_propagate_error (simple, error))
        return NULL;

    return g_bytes_ref ((GBytes *)g_simple_async_result_get_op_res_gpointer (simple));
}

GdGTasksService *
gd_gtasks_service_new (const char *client_id,
                       const char *client_secret)
{
    return g_object_new (GD_TYPE_GTASKS_SERVICE,
        "client-id", client_id,
        "client-secret", client_secret,
        NULL);
}

static void
gd_gtasks_service_set_property (GObject *object, guint prop_id, const GValue *value, GParamSpec *pspec)
{
    GdGTasksService *service = GD_GTASKS_SERVICE (object);

    switch (prop_id)
    {
        case PROP_CLIENT_ID:
            service->priv->client_id = g_value_dup_string (value);
            break;
        case PROP_CLIENT_SECRET:
            service->priv->client_secret = g_value_dup_string (value);
            break;
        case PROP_ACCESS_TOKEN:
            g_object_set_property (G_OBJECT (service->priv->proxy), "access-token", value);
            break;
        default:
            G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
            break;
    }
}

static void
gd_gtasks_service_get_property (GObject *object, guint prop_id, GValue *value, GParamSpec *pspec)
{
    GdGTasksService *service = GD_GTASKS_SERVICE (object);

    switch (prop_id)
    {
        case PROP_CLIENT_ID:
            g_value_set_string (value, service->priv->client_id);
            break;
        case PROP_CLIENT_SECRET:
            g_value_set_string (value, service->priv->client_secret);
            break;
        case PROP_ACCESS_TOKEN:
            g_object_get_property (G_OBJECT (service->priv->proxy), "access-token",
                value);
            break;
        default:
            G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
            break;
    }
}

static void
gd_gtasks_service_init (GdGTasksService *service)
{
    service->priv = G_TYPE_INSTANCE_GET_PRIVATE(service, GD_TYPE_GTASKS_SERVICE, GdGTasksServicePrivate);
}

static void
gd_gtasks_service_constructed (GObject *object)
{
    GdGTasksService *service = (GdGTasksService *)object;

    service->priv->proxy = oauth2_proxy_new (service->priv->client_id,
        NULL, GTASKS_URL, FALSE);

    G_OBJECT_CLASS (gd_gtasks_service_parent_class)->constructed (object);
}

static void
gd_gtasks_service_finalize (GObject *object)
{
    GdGTasksService *service = GD_GTASKS_SERVICE (object);

    g_free (service->priv->client_id);
    g_free (service->priv->client_secret);

    g_clear_object (&service->priv->proxy);

    G_OBJECT_CLASS (gd_gtasks_service_parent_class)->finalize (object);
}

static void
gd_gtasks_service_class_init (GdGTasksServiceClass *klass)
{
    GObjectClass* object_class = G_OBJECT_CLASS (klass);
    GObjectClass* parent_class = G_OBJECT_CLASS (klass);

    object_class->set_property = gd_gtasks_service_set_property;
    object_class->get_property = gd_gtasks_service_get_property;

    object_class->constructed = gd_gtasks_service_constructed;
    object_class->finalize = gd_gtasks_service_finalize;

    g_object_class_install_property (object_class, PROP_CLIENT_ID,
        g_param_spec_string ("client-id", "client-id",
            "The OAuth2 client id", NULL,
            G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY | G_PARAM_STATIC_STRINGS));

    g_object_class_install_property (object_class, PROP_CLIENT_SECRET,
        g_param_spec_string ("client-secret", "client-secret",
            "The OAuth2 client secret", NULL,
            G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY | G_PARAM_STATIC_STRINGS));

    g_object_class_install_property (object_class, PROP_ACCESS_TOKEN,
        g_param_spec_string ("access-token", "access-token",
            "The OAuth2 access token", NULL,
            G_PARAM_READWRITE | G_PARAM_STATIC_STRINGS));

    g_type_class_add_private (object_class, sizeof(GdGTasksServicePrivate));
}

