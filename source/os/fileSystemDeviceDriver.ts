/* ------------
    fileSystemDeviceDriver.ts

     ------------ */

module TSOS {

    export class FileSystemDeviceDriver extends DeviceDriver {

        //track
        public t;
        //sector
        public s;
        //block
        public b;
        //block size
        public bSize;
        public directory;
        public data;

        constructor() {
            //access the parent and overwrite
            super();
            this.t = 4;
            this.s = 8;
            this.b = 8;
            this.bSize = 64;
            this.directory =  this.s * this.b;
            this.data = (this.t-1) * this.s * this.b;
            this.driverEntry = this.fsDDEntry;
        }
        public fsDDEntry() {
            //New fsDD when a new window is open
            if(sessionStorage){
                if(sessionStorage.length == 0) { 
                    var index = new Array<string>();
                    for (var i=0; i < 4; i++) {
                        //byte/pointer
                        index.push("0");
                    }
                    //while the value is less than block size
                    while (index.length < this.bSize){
                        index.push("00");
                    }
                    for (var i=0; i < this.t; i++) {
                        for (var a=0; a < this.s; a++) {
                            for (var b=0; b < this.b; b++) {
                                //tsb
                                sessionStorage.setItem(i.toString() + a.toString() + b.toString(), JSON.stringify(index));
                            }
                        }
                    }
                    //display the disk
                    Control.hardDiskDisplay();
                }
            } 
        }
        //file list
        public lS(): string[] {
            var data = new Array<string>();
            var names = new Array<string>();
            var directory;
            //look for file names
            for (var i=1; i < this.directory; i++) {
                data = JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
                if(data[0] == "1"){
                    directory = this.retrieveName(data);
                    names.push(directory);
                    directory = "";
                }
            }
            return(names);
        }
        //look for existing file names
        public retrieveName(data): string {
            var value = 4;
            var name = "";
            //while file exists
            while(data[value] != "00" && value < this.bSize) {
                //file name
                name = name + String.fromCharCode(parseInt(data[value],16));
                value++;
            }
            //return the file name
            return name;
        }
        //create file
        public create(name): string {
            var data = new Array<string>();
            //look for dup file names
            if (this.searchTSBData(name) != null) {
                return "File name already exist";
            } else {
                //MBR is 000
                for (var i=1; i < this.directory; i++) {
                    data = JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
                    if(data[0]=="0"){
                        //clear block with zeros
                        this.clearBlock(sessionStorage.key(i));
                        data = JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
                        if(this.retrieveTSBValue() != null) {
                            data[0] = "1";
                            for (var a=1; a < 4; a++){
                                //directory pointer
                                data[a] = this.retrieveTSBValue().charAt(a-1);
                            }
                            for (var b=0; b < name.toString().length; b++) {
                                data[b+4] = name.toString().charCodeAt(b).toString(16).toUpperCase();
                            }
                            //update the disk
                            this.diskTSB(sessionStorage.key(i),data);
                            return name + " successfully created";
                        } else {
                            return "Disk is full";
                        }
                    }
                }
                return "Directory is full";
            }   
        }
        //search for data
        public searchTSBData(name): string {
            var data;
            var dataarr = new Array<string>();
            var fileName;
            //searcj directory
            for (var i=1; i < this.directory; i++) {
                dataarr = JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
                //if in used
                if(dataarr[0] == "1") {
                    fileName = this.retrieveName(dataarr);
                    if (this.retrieveName(dataarr) == name){
                        data = dataarr.splice(1,3).toString().replace(/,/g,"");
                        dataarr = JSON.parse(sessionStorage.getItem(data));
                        return data;
                    }
                    fileName = "";
                }
            }
            return null;
        }
        //clear disk block
        public clearBlock(tsb){
            var data = JSON.parse(sessionStorage.getItem(tsb));
            //fill block with zero
            for (var i=0; i < 4; i++){
                data[i] = "0";
            }
            for (var a=4; a < data.length; a++) {
                data[a] = "00";
            }
            //update disk
            this.diskTSB(tsb, data);
        }
        //look for TSB data
        public retrieveTSBValue():string {
            var data = new Array<string>();
            for (var i=this.directory; i < sessionStorage.length; i++) {
                data = JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
                //if array is empty
                if(data[0] == "0") {
                    //clear block
                    this.clearBlock(sessionStorage.key(i));
                    data = JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
                    data[0]="1";
                    //update disk
                    this.diskTSB(sessionStorage.key(i), data);
                    return sessionStorage.key(i); 
                }
            }
            return null;
        }
        //update disk block
        public diskTSB(tsb, data){
            sessionStorage.setItem(tsb,JSON.stringify(data));
            //update the hard disk display
            Control.updateDiskDisplay(tsb);
        }
        //read file
        public read(name): string {
            var d = new Array<string>();
            var data = name + " - ";
            var p;
            var value;
            var character;
            // check if file exist
            if (this.searchTSBData(name) != null) {
                d = JSON.parse(sessionStorage.getItem(this.searchTSBData(name)));
                p = this.retrievePointer(d);
                value = 4;
                while(value < this.bSize && d[value] != "00") {
                    //add letters to the data
                    character = parseInt(d[value],16);
                    data += String.fromCharCode(character)
                    value++;
                    //when more than one block needs to be read
                    if(value == this.bSize && p != ":1:1:1") {
                        d = JSON.parse(sessionStorage.getItem(p));
                        p = this.retrievePointer(d);
                        value = 4;
                    }
                }
                return data;
            } else {
                //if no file with the input name is found
                return "File does not exist";
            }
        }
        //pointer
        public retrievePointer(data): string {
            //return pointer
            return data[1] + data[2] + data[3];
        }
        //write file
        public write(name, data): string{
            //search directory
            var value = new Array<string>();
            if(this.searchTSBData(name) != null){
                value = this.convertString(data);
                //if file is created
                if (this.diskWrite(this.searchTSBData(name), value)){
                    return name + " successfully written";
                } else {
                    return "disk is full";
                }
            } else {
                return "File does not exist";
            }
        }
        //string to hex
        public convertString(string): string[] {
            //store the string in an array
            var hex= new Array<string>();
            for(var i=string.length-1; i >= 0; i--) {
                hex.push(string.charCodeAt(i).toString(16).toUpperCase());
            }
            return hex;
        }
        //write to disk
        public diskWrite(dTSB, data): boolean {
            var exist = new Array<string>();
            var d = new Array<string>();
            d = JSON.parse(sessionStorage.getItem(dTSB));
            var initial;
            var index = 0;
            var p = this.retrievePointer(d);
            if (p == "000") {
                index = 4;
            } else {
                //while pointer is not taken
                while(p != ":1:1:1") {
                    dTSB = p;
                    exist.push(dTSB);
                    d = JSON.parse(sessionStorage.getItem(dTSB));      
                    p = this.retrievePointer(d);                         
                }
                //check where the last data finish
                for(var i=4; i < d.length; i++) {
                    if(d[i] == "00") {
                        index = i;
                        break;
                    }
                }
            }
            initial = index;
            while(data.length > 0) {
                //when one block is not enough
                if(index == this.bSize){
                    //retrieve new block
                    var oldDTSB = dTSB;
                    dTSB = this.retrieveTSBValue();
                    exist.push(dTSB);
                    //clear block
                    if(dTSB!=null) {
                        //add pointer
                        for (var a=1; a < 4; a++) {
                            d[a] = dTSB.charAt(a-1);
                        }
                        //update block
                        this.diskTSB(oldDTSB, d);
                        d = JSON.parse(sessionStorage.getItem(dTSB));
                        index = 4;
                    } else {
                        //out of block
                        for (var tsb in exist) {
                            //clear block
                            this.clearBlock(tsb);
                        }
                        for (var b=initial; b < this.bSize; b++) {
                            d = JSON.parse(sessionStorage.getItem(dTSB));
                            d[b] = "00";
                            this.diskTSB(dTSB, d);
                        }
                        return false;
                    }
                } else{
                    //available space in block
                    d[index] = data.pop();
                    index++;
                }
            }
            //save the previous block
            for (var c=1; c < 4; c++) {
                //indication for previous block
                d[c] = ":1"; 
            }
            //update disk
            this.diskTSB(dTSB,d);
            return true;
        }
        //delete file
        public delete(name): string {
            var value = new Array<string>();
            var content = this.searchTSBData(name);
            var p;
            //if content exists
            if (content != null){
                //directory deletion
                for(var i=0; i < this.directory; i++) {
                    value = JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
                    p = this.retrievePointer(value);
                    //if pointer is equal to content
                    if(p == content) {
                        value[0] = "0";
                        this.diskTSB(sessionStorage.key(i), value);
                        break;
                    }
                }
                //tsb data deletion
                p = this.deleteAssist(content);
                if(p != "000"){
                    while(p != ":1:1:1") {
                        content = p;
                        p = this.deleteAssist(content);
                    }
                }
                return "File Deleted";
            } else {
                return "File does not exist";
            }
        }
        //delete
        public deleteAssist(tsb): string{
            var data = JSON.parse(sessionStorage.getItem(tsb));
            data[0]= "0";
            this.diskTSB(tsb, data);
            return this.retrievePointer(data);
        }
    }
}