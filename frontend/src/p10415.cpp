#include <bits/stdc++.h>
using namespace std;

int main(){

    int cases, trid, item;
    string mode;

    cin >> cases;

    for(int i = 0; i < cases; i++){
        set<int> ignore;
        map<int, int> mutex;
        map<int, set<int>> shared;

        while(1){
            cin >> mode;

            if(mode == "#"){
                break;
            }

            cin >> trid >> item;

            if(ignore.find(trid) != ignore.end()){
                cout << "IGNORE\n";
                continue;
            }

            if(mode == "S"){
                if(mutex.find(item) != mutex.end()){
                    if(mutex[item] != trid){
                        cout << "DENIED\n";
                        ignore.insert(trid);
                    }

                    else {
                        cout << "GRANTED\n";
                    }
                }

                else {
                    cout << "GRANTED\n";
                    shared[item].insert(trid);
                }

                continue;
            }

            if(mode == "X"){
                if(shared.find(item) != shared.end()){
                    if(shared[item].size() == 1 || *(shared[item].begin()) != trid){
                        cout << "DENIED\n";
                        ignore.insert(trid);
                    }
                    else{
                        cout << "GRANTED\n";
                        mutex[item] = trid;
                    }
                }

                else if(mutex.find(item) != mutex.end() || mutex[item] == trid){
                    cout << "GRANTED\n";
                    mutex[item] = trid;
                }

                else{
                    cout << "DENIED\n";
                    ignore.insert(trid);
                }
            }
        }

        if(i != (cases - 1)){
            cout << "\n";
        }
    }
    return 0;
}