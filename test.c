#include <stdio.h>

int main() {
    int* p = NULL;
    *p = 42; // MISRA violation: null pointer dereference
    return 0;
}