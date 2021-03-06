/* ------------
     memoryAccessor.ts
     
     ------------ */
module TSOS {

    export class MemoryAccessor {
           
        //three partitions
        public partition0 = false;
        public partition1 = false;
        public partition2 = false;

        public init(): void {
            //free partitions and update the memory display
            this.partition0 = false;
            this.partition1 = false;
            this.partition2 = false;
            Control.memDisplay();
        }
        //find and read the partition
        public findPart(part, max) {
            
        }
        //will write the partition
        public usePart(part, arr, data){
            
           Control.updateMemDisplay(part);
        }
    }
} 