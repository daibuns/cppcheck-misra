#include <iostream>
using namespace std;

int main() {
    int* ptr = nullptr;
    *ptr = 100; // MISRA C++ violation: null pointer dereference
    
    // Another common MISRA violation: using goto
    goto end;
    
    cout << "This won't be printed" << endl;
    
end:
    return 0;
}