package pool

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPoolBoutOrder(t *testing.T) {
	t.Parallel()

	tests := []struct {
		size  int
		first [2]int
		last  [2]int
	}{
		{2, [2]int{1, 2}, [2]int{1, 2}},
		{3, [2]int{1, 2}, [2]int{3, 1}},
		{4, [2]int{1, 4}, [2]int{1, 2}},
		{5, [2]int{1, 2}, [2]int{4, 2}},
		{6, [2]int{1, 2}, [2]int{3, 6}},
		{7, [2]int{1, 4}, [2]int{4, 7}},
		{8, [2]int{2, 3}, [2]int{1, 3}},
		{9, [2]int{1, 9}, [2]int{9, 8}},
		{10, [2]int{1, 4}, [2]int{1, 10}},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("pool of %d", tt.size), func(t *testing.T) {
			t.Parallel()

			order := poolBoutOrder(tt.size)

			assert.Len(t, order, tt.size*(tt.size-1)/2)
			assert.Equal(t, tt.first, order[0])
			assert.Equal(t, tt.last, order[len(order)-1])

			seen := make(map[[2]int]bool, len(order))
			for _, pair := range order {
				assert.NotEqual(t, pair[0], pair[1], "self pair %v", pair)
				assert.True(t, pair[0] >= 1 && pair[0] <= tt.size, "position out of range in %v", pair)
				assert.True(t, pair[1] >= 1 && pair[1] <= tt.size, "position out of range in %v", pair)

				key := [2]int{min(pair[0], pair[1]), max(pair[0], pair[1])}
				assert.False(t, seen[key], "pair %v repeated", key)
				seen[key] = true
			}
		})
	}
}

func TestPoolBoutOrderUnsupportedSize(t *testing.T) {
	t.Parallel()

	for _, size := range []int{0, 1, 11} {
		t.Run(fmt.Sprintf("size %d", size), func(t *testing.T) {
			t.Parallel()

			assert.Nil(t, poolBoutOrder(size))
		})
	}
}
