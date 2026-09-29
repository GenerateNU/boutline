package utils

import "cmp"

func Clamp[T cmp.Ordered](value, low, high T) T {
	return min(max(value, low), high)
}
