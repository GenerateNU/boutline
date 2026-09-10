package testkit

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type HTTPMethod string

const (
	GET    HTTPMethod = http.MethodGet
	POST   HTTPMethod = http.MethodPost
	PUT    HTTPMethod = http.MethodPut
	PATCH  HTTPMethod = http.MethodPatch
	DELETE HTTPMethod = http.MethodDelete
)

type Request struct {
	App     *fiber.App
	Route   string
	Method  HTTPMethod
	Body    any
	Query   map[string]string
	Headers map[string]string
}

type IntegrationTestBuilder struct {
	t        *testing.T
	response *http.Response
	body     map[string]any
	raw      []byte
}

func New(t *testing.T) *IntegrationTestBuilder {
	t.Helper()
	return &IntegrationTestBuilder{t: t}
}

func (tb *IntegrationTestBuilder) Request(r Request) *IntegrationTestBuilder {
	tb.t.Helper()

	method := string(r.Method)
	if method == "" {
		method = http.MethodGet
	}

	body := bytes.NewBuffer(nil)
	if r.Body != nil {
		encoded, err := json.Marshal(r.Body)
		require.NoError(tb.t, err)
		body = bytes.NewBuffer(encoded)
	}

	req := httptest.NewRequest(method, buildURL(r.Route, r.Query), body)
	for key, value := range r.Headers {
		req.Header.Set(key, value)
	}
	if r.Body != nil {
		req.Header.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSON)
	}

	resp, err := r.App.Test(req)
	require.NoError(tb.t, err)
	tb.t.Cleanup(func() { _ = resp.Body.Close() })

	tb.response = resp
	tb.raw, err = io.ReadAll(resp.Body)
	require.NoError(tb.t, err)

	// A non-JSON body is legitimate for some routes, so leave tb.body nil
	// rather than failing here; the field assertions will report it.
	_ = json.Unmarshal(tb.raw, &tb.body)

	return tb
}

func buildURL(route string, query map[string]string) string {
	if len(query) == 0 {
		return route
	}

	values := url.Values{}
	for key, value := range query {
		values.Set(key, value)
	}

	return route + "?" + values.Encode()
}

func (tb *IntegrationTestBuilder) AssertStatus(code int) *IntegrationTestBuilder {
	tb.t.Helper()
	assert.Equal(tb.t, code, tb.response.StatusCode, "unexpected status, body: %s", tb.raw)
	return tb
}

func (tb *IntegrationTestBuilder) AssertField(field string, expected any) *IntegrationTestBuilder {
	tb.t.Helper()
	assert.Equal(tb.t, expected, tb.body[field], "unexpected value for field %q", field)
	return tb
}

func (tb *IntegrationTestBuilder) AssertFieldExists(field string) *IntegrationTestBuilder {
	tb.t.Helper()
	_, ok := tb.body[field]
	assert.True(tb.t, ok, "field %q does not exist in body: %s", field, tb.raw)
	return tb
}

func (tb *IntegrationTestBuilder) AssertBody(expected map[string]any) *IntegrationTestBuilder {
	tb.t.Helper()
	assert.Equal(tb.t, expected, tb.body)
	return tb
}

func (tb *IntegrationTestBuilder) AssertArraySize(size int) *IntegrationTestBuilder {
	tb.t.Helper()
	items, ok := tb.body["data"].([]any)
	require.True(tb.t, ok, "data field is not an array, body: %s", tb.raw)
	assert.Len(tb.t, items, size)
	return tb
}

func (tb *IntegrationTestBuilder) GetBody() map[string]any {
	return tb.body
}

func (tb *IntegrationTestBuilder) DebugLogging() *IntegrationTestBuilder {
	fmt.Fprintf(os.Stderr, "Response: %s\n", tb.raw)
	return tb
}
